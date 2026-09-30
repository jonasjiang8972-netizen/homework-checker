'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MarkdownRenderer } from '../../lib/markdown-renderer';

interface ReviewItem {
  id: string;
  questionId: string;
  stage: number;
  knowledgePoint: string;
  question: string;
  subject: string;
  imageUrl: string;
  errorType: string;
  guidance: string;
  correctSolution: string;
  analysis: string;
}

const STAGES = 5;

export default function ReviewPage() {
  const { status } = useSession();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [upcoming, setUpcoming] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews');
      const json = await res.json();
      if (json.error) setError(json.error);
      else { setItems(json.items || []); setUpcoming(json.upcomingCount || 0); }
    } catch {
      setError('加载失败了，检查一下网络吧');
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  if (status === 'loading') return <div style={styles.center}>加载中...</div>;
  if (status === 'unauthenticated') {
    return (
      <div style={styles.center}>
        <p>复习错题需要先登录</p>
        <Link href="/settings" style={styles.primary}>前往登录</Link>
      </div>
    );
  }

  const current = items[0];

  const answer = async (remembered: boolean) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, remembered }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); }
      else {
        setItems((prev) => prev.slice(1));
        setDoneCount((n) => n + 1);
        setRevealed(false);
        setError('');
      }
    } catch {
      setError('提交失败，再试一次吧');
    }
    setBusy(false);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>错题复习 🔁</h1>
      <p style={styles.sub}>按 1、3、7、14、30 天的节奏复习，记得牢才算真的会</p>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.muted}>加载中...</div>
      ) : !current ? (
        <div style={styles.card}>
          <div style={{ fontSize: '40px' }}>🎉</div>
          <p style={{ margin: '8px 0', fontWeight: 600 }}>
            {doneCount > 0 ? `太棒了，这轮复习了 ${doneCount} 道题` : '现在没有需要复习的错题'}
          </p>
          {upcoming > 0 && <p style={styles.muted}>还有 {upcoming} 道题在等待下一次复习</p>}
          <Link href="/" style={styles.primary}>去做作业</Link>
        </div>
      ) : (
        <div style={styles.card}>
          <div style={styles.meta}>
            <span>剩余 {items.length} 题</span>
            <span>第 {current.stage + 1}/{STAGES} 轮</span>
          </div>
          {current.knowledgePoint && <div style={styles.tag}>📚 {current.knowledgePoint}</div>}
          {current.errorType && <div style={{ ...styles.tag, color: '#d63031' }}>上次错因：{current.errorType}</div>}

          {current.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt="题目图片" style={styles.img} />
          )}
          {current.question && <p style={styles.question}>{current.question}</p>}
          {current.guidance && <div style={styles.hint}>💡 {current.guidance}</div>}

          {!revealed ? (
            <button onClick={() => setRevealed(true)} style={styles.secondary}>先自己做，做完看答案</button>
          ) : (
            <>
              {current.correctSolution && (
                <div style={styles.answer}>
                  <div style={styles.answerTitle}>正确解答</div>
                  <MarkdownRenderer content={current.correctSolution} />
                </div>
              )}
              {current.analysis && <div style={styles.hint}>为什么错：{current.analysis}</div>}
              <div style={styles.actions}>
                <button disabled={busy} onClick={() => answer(false)} style={styles.again}>还不会 · 明天再来</button>
                <button disabled={busy} onClick={() => answer(true)} style={styles.primaryBtn}>我会了</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px', background: '#f8f9fc', minHeight: '100vh' },
  center: { maxWidth: '400px', margin: '60px auto', textAlign: 'center', color: '#8e95a2' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sub: { fontSize: '13px', color: '#8e95a2', margin: '4px 0 16px' },
  muted: { color: '#8e95a2', fontSize: '13px', textAlign: 'center', padding: '12px 0' },
  error: { background: '#fff5f5', color: '#d63031', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
  card: { background: 'white', border: '1px solid #eef0f4', borderRadius: '14px', padding: '16px', textAlign: 'center' },
  meta: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8e95a2', marginBottom: '10px' },
  tag: { textAlign: 'left', fontSize: '13px', color: '#4f6ef7', marginBottom: '6px' },
  img: { maxWidth: '100%', borderRadius: '10px', margin: '8px 0' },
  question: { textAlign: 'left', fontSize: '15px', color: '#1a1a2e', lineHeight: 1.6 },
  hint: { textAlign: 'left', background: '#f5f7ff', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#444', margin: '10px 0' },
  answer: { textAlign: 'left', margin: '12px 0' },
  answerTitle: { fontSize: '12px', color: '#8e95a2', marginBottom: '4px' },
  actions: { display: 'flex', gap: '10px', marginTop: '12px' },
  primary: { display: 'inline-block', marginTop: '12px', padding: '10px 24px', background: '#4f6ef7', color: 'white', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' },
  primaryBtn: { flex: 1, padding: '12px', background: '#00b894', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' },
  again: { flex: 1, padding: '12px', background: '#f0f2f5', color: '#666', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' },
  secondary: { width: '100%', marginTop: '12px', padding: '12px', background: '#4f6ef7', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' },
};
