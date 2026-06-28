'use client';

import { useEffect, useState } from 'react';

interface Question {
  id: string;
  question: string;
  error_analysis: string;
  subject: string;
  image_url: string;
  created_at: string;
}

export default function History() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/questions');
      const json = await res.json();
      if (json.error) {
        setFetchError(json.error);
        setQuestions([]);
      } else {
        setQuestions(json.data || []);
      }
    } catch {
      setFetchError('加载失败，请检查网络');
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <a href="/" style={styles.backLink}>← 返回</a>
          <h1 style={styles.title}>📋 错题本</h1>
          <div style={{ width: '60px' }} />
        </header>

        {loading ? (
          <div style={styles.skeletonList}>
            {[0, 1, 2].map((i) => <div key={i} style={styles.skeletonItem} />)}
          </div>
        ) : fetchError ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⚠️</div>
            <p style={styles.emptyText}>{fetchError}</p>
            <button onClick={fetchQuestions} style={styles.retryBtn}>重试</button>
          </div>
        ) : questions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📝</div>
            <p style={styles.emptyText}>暂无错题记录</p>
            <a href="/" style={styles.emptyBtn}>去添加第一道错题</a>
          </div>
        ) : (
          <ul style={styles.list}>
            {questions.map((q) => (
              <li key={q.id} style={styles.item}>
                <div style={styles.itemHeader} onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                  <span style={styles.subject}>{q.subject || '未分类'}</span>
                  <span style={styles.date}>{formatDate(q.created_at)}</span>
                </div>
                <p style={styles.question}>{q.question || '（图片题目）'}</p>
                {expanded === q.id && (
                  <div style={styles.analysis}>
                    <strong>错因分析：</strong>
                    <p style={styles.analysisText}>{q.error_analysis}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    maxWidth: '480px', margin: '0 auto', background: 'white',
    borderRadius: '24px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  backLink: { color: '#667eea', textDecoration: 'none', fontSize: '14px', width: '60px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  skeletonItem: {
    height: '72px', borderRadius: '14px',
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear',
  },
  emptyState: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon: { fontSize: '56px', marginBottom: '12px' },
  emptyText: { color: '#888', marginBottom: '16px' },
  emptyBtn: {
    display: 'inline-block', padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
  },
  retryBtn: {
    padding: '10px 20px', background: '#667eea', color: 'white', border: 'none',
    borderRadius: '10px', fontSize: '14px', cursor: 'pointer',
  },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
  item: { padding: '16px', background: '#f8f9fc', borderRadius: '14px', border: '1px solid #eee' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' },
  subject: { fontSize: '12px', fontWeight: 600, color: '#667eea', background: '#eef1ff', padding: '3px 10px', borderRadius: '8px' },
  date: { fontSize: '12px', color: '#aaa' },
  question: { margin: 0, fontSize: '14px', color: '#444', lineHeight: '1.5' },
  analysis: { marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #ddd', fontSize: '13px', color: '#666' },
  analysisText: { margin: '6px 0 0 0', lineHeight: '1.6' },
};