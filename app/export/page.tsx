'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MarkdownRenderer } from '../../lib/markdown-renderer';

interface WrongItem {
  id: string;
  subject: string;
  imageUrl: string;
  knowledgePoint: string;
  errorType: string;
  createdAt: string;
  errorSpot: string;
  correctSolution: string;
  analysis: string;
}

const PRINT_CSS = `
@media print {
  .no-print, nav { display: none !important; }
  body { background: white !important; }
  .sheet { padding: 0 !important; max-width: none !important; }
  .q { break-inside: avoid; page-break-inside: avoid; }
}
`;

/** 错题导出：按条件筛选后用浏览器「打印 → 另存为 PDF」生成错题本或练习卷 */
export default function ExportPage() {
  const { status } = useSession();
  const [days, setDays] = useState(0);
  const [subject, setSubject] = useState('全部');
  const [mode, setMode] = useState<'book' | 'practice'>('book');
  const [items, setItems] = useState<WrongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: '100' });
    if (days > 0) params.set('days', String(days));
    if (subject !== '全部') params.set('subject', subject);
    try {
      const res = await fetch(`/api/export/wrong?${params}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setItems(json.items || []);
    } catch {
      setError('加载失败了，检查一下网络吧');
    }
    setLoading(false);
  }, [days, subject]);

  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  if (status === 'loading') return <div style={styles.center}>加载中...</div>;
  if (status === 'unauthenticated') {
    return (
      <div style={styles.center}>
        <p>导出错题需要先登录</p>
        <Link href="/settings">前往登录</Link>
      </div>
    );
  }

  return (
    <div className="sheet" style={styles.page}>
      <style>{PRINT_CSS}</style>

      <div className="no-print" style={styles.controls}>
        <h1 style={styles.title}>导出错题 🖨️</h1>
        <div style={styles.row}>
          <label style={styles.label}>时间
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={styles.select}>
              <option value={0}>全部</option>
              <option value={7}>近 7 天</option>
              <option value={30}>近 30 天</option>
              <option value={90}>近 90 天</option>
            </select>
          </label>
          <label style={styles.label}>学科
            <select value={subject} onChange={(e) => setSubject(e.target.value)} style={styles.select}>
              {['全部', '数学', '语文', '英语', '其他'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div style={styles.row}>
          <button onClick={() => setMode('book')} style={{ ...styles.chip, ...(mode === 'book' ? styles.chipActive : {}) }}>错题本（含答案）</button>
          <button onClick={() => setMode('practice')} style={{ ...styles.chip, ...(mode === 'practice' ? styles.chipActive : {}) }}>练习卷（不含答案）</button>
        </div>
        <button onClick={() => window.print()} disabled={items.length === 0} style={styles.printBtn}>
          打印 / 另存为 PDF（{items.length} 题）
        </button>
        <p style={styles.tip}>在打印窗口的「目标打印机」选择「另存为 PDF」即可。</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {loading ? (
        <div style={styles.center}>加载中...</div>
      ) : items.length === 0 ? (
        <div style={styles.center}>这个范围内没有错题 👍</div>
      ) : (
        <>
          <h2 style={styles.sheetTitle}>{mode === 'book' ? '我的错题本' : '错题练习卷'}</h2>
          <div style={styles.sheetMeta}>共 {items.length} 题 · 生成于 {new Date().toLocaleDateString('zh-CN')}</div>
          {items.map((it, i) => (
            <div key={it.id} className="q" style={styles.q}>
              <div style={styles.qHead}>
                <b>第 {i + 1} 题</b>
                <span style={styles.qMeta}>
                  {it.subject}{it.knowledgePoint ? ` · ${it.knowledgePoint}` : ''}
                  {mode === 'book' && it.errorType ? ` · ${it.errorType}` : ''}
                </span>
              </div>
              {it.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt={`第 ${i + 1} 题`} style={styles.img} />
              )}
              {mode === 'book' ? (
                <>
                  {it.errorSpot && it.errorSpot !== '无' && <div style={styles.field}><b>错在哪：</b>{it.errorSpot}</div>}
                  {it.correctSolution && (
                    <div style={styles.field}><b>正确解答：</b><MarkdownRenderer content={it.correctSolution} /></div>
                  )}
                  {it.analysis && <div style={styles.field}><b>错因：</b>{it.analysis}</div>}
                </>
              ) : (
                <div style={styles.workspace} />
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '720px', margin: '0 auto', padding: '20px 16px 80px', background: 'white', minHeight: '100vh' },
  center: { maxWidth: '400px', margin: '40px auto', textAlign: 'center', color: '#8e95a2' },
  controls: { marginBottom: '20px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' },
  row: { display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' },
  label: { fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' },
  select: { padding: '6px 8px', borderRadius: '8px', border: '1px solid #dfe3ea', fontSize: '13px' },
  chip: { padding: '6px 14px', fontSize: '13px', color: '#666', background: '#f0f2f5', border: 'none', borderRadius: '20px', cursor: 'pointer' },
  chipActive: { color: 'white', background: '#4f6ef7' },
  printBtn: { padding: '10px 20px', background: '#4f6ef7', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  tip: { fontSize: '12px', color: '#8e95a2', margin: '6px 0 0' },
  error: { background: '#fff5f5', color: '#d63031', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
  sheetTitle: { fontSize: '20px', textAlign: 'center', margin: '8px 0 4px' },
  sheetMeta: { fontSize: '12px', color: '#8e95a2', textAlign: 'center', marginBottom: '16px' },
  q: { border: '1px solid #e5e8ee', borderRadius: '8px', padding: '12px', marginBottom: '12px' },
  qHead: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' },
  qMeta: { fontSize: '12px', color: '#8e95a2' },
  img: { maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', display: 'block', margin: '6px 0' },
  field: { fontSize: '13px', lineHeight: 1.6, color: '#333', marginTop: '6px' },
  workspace: { height: '120px', borderTop: '1px dashed #cfd4dc', marginTop: '8px' },
};
