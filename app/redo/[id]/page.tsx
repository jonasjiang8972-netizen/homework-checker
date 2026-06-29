'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface GradingResult {
  is_correct: boolean;
  error_type: string;
  knowledge_point: string;
  error_spot: string;
  correct_solution: string;
  analysis: string;
  knowledge_tags: string[];
}

interface Question {
  id: string;
  question: string;
  error_analysis: string;
  subject: string;
  image_url: string;
  created_at: string;
  is_correct: boolean | null;
  knowledge_point: string | null;
  error_type: string | null;
}

export default function RedoPage() {
  const { id } = useParams<{ id: string }>();
  const [q, setQ] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/questions/${id}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setQ(json.data);
      }
    } catch {
      setError('加载失败');
    }
    setLoading(false);
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.skeletonItem} />
          <div style={{ ...styles.skeletonItem, height: '200px', marginTop: '12px' }} />
        </div>
      </div>
    );
  }

  if (error || !q) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⚠️</div>
            <p style={styles.emptyText}>{error || '题目不存在'}</p>
            <a href="/history" style={styles.backBtn}>← 返回错题本</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <a href="/history" style={styles.backLink}>← 返回</a>
          <h1 style={styles.title}>🔄 错题重做</h1>
          <div style={{ width: '60px' }} />
        </header>

        {q.image_url && (
          <img src={q.image_url} alt="题目图片" style={styles.questionImage} />
        )}

        <div style={styles.meta}>
          {q.knowledge_point && <span style={styles.tag}>📚 {q.knowledge_point}</span>}
          {q.error_type && <span style={styles.tag}>❌ {q.error_type}</span>}
          <span style={styles.date}>{formatDate(q.created_at)}</span>
        </div>

        <div style={styles.prompt}>重新做一遍这道题，看看是否掌握了：</div>

        {!revealed ? (
          <div>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="输入你的答案..."
              style={styles.textarea}
              rows={5}
            />
            <button
              onClick={handleReveal}
              disabled={!answer.trim() || submitting}
              style={{
                ...styles.submitBtn,
                ...(!answer.trim() || submitting ? styles.disabled : {}),
              }}
            >
              📝 查看正确答案
            </button>
          </div>
        ) : (
          <div style={styles.resultBox}>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>✏️ 你的答案</div>
              <div style={styles.sectionBody}>{answer}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>✅ 正确解答</div>
              <div style={{ ...styles.sectionBody, ...styles.correctAnswer }}>
                {q.error_analysis}
              </div>
            </div>

            {q.is_correct != null && (
              <div style={{
                ...styles.verdict,
                background: q.is_correct ? '#eafaf1' : '#fff5f5',
                color: q.is_correct ? '#27ae60' : '#d63031',
              }}>
                {q.is_correct ? '✅ 原题全部正确' : '❌ 原题存在错误'}
              </div>
            )}

            {q.error_type && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>错误类型</div>
                <span style={styles.errorTag}>{q.error_type}</span>
              </div>
            )}

            {q.knowledge_point && (
              <div style={styles.actionRow}>
                <a href={`/quiz?kp=${encodeURIComponent(q.knowledge_point)}`} style={styles.quizBtn}>
                  📝 做同类题测验
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { maxWidth: '480px', margin: '0 auto', background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  backLink: { color: '#667eea', textDecoration: 'none', fontSize: '14px', width: '60px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  skeletonItem: { height: '60px', borderRadius: '14px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },
  emptyState: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon: { fontSize: '56px', marginBottom: '12px' },
  emptyText: { color: '#888', marginBottom: '16px' },
  backBtn: { display: 'inline-block', padding: '10px 20px', background: '#667eea', color: 'white', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500 },
  questionImage: { width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '12px', marginBottom: '14px', background: '#f5f5f5' },
  meta: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' },
  tag: { fontSize: '12px', fontWeight: 500, padding: '3px 10px', borderRadius: '8px', background: '#eef1ff', color: '#667eea' },
  date: { fontSize: '12px', color: '#aaa', marginLeft: 'auto' },
  prompt: { fontSize: '14px', color: '#555', marginBottom: '12px', fontWeight: 500 },
  textarea: { width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.6', fontFamily: 'inherit' },
  submitBtn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '12px' },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  resultBox: { marginTop: '16px' },
  section: { marginBottom: '16px' },
  sectionTitle: { fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' },
  sectionBody: { fontSize: '14px', lineHeight: '1.7', color: '#333', padding: '12px', background: '#f8f9fc', borderRadius: '10px', whiteSpace: 'pre-wrap' },
  correctAnswer: { background: '#eafaf1', color: '#1a6e2e' },
  verdict: { fontSize: '14px', fontWeight: 600, padding: '10px', borderRadius: '10px', textAlign: 'center', marginBottom: '14px' },
  errorTag: { fontSize: '13px', fontWeight: 500, padding: '4px 12px', borderRadius: '8px', background: '#fff5f5', color: '#d63031', display: 'inline-block' },
  actionRow: { marginTop: '12px' },
  quizBtn: { display: 'block', padding: '12px', fontSize: '14px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textDecoration: 'none', borderRadius: '12px', textAlign: 'center' },
};
