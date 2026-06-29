'use client';

import { useEffect, useState, useMemo } from 'react';
import { MarkdownRenderer } from '../../lib/markdown-renderer';

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
  grading: GradingResult | null;
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  '计算失误': '#e17055',
  '概念不清': '#fdcb6e',
  '审题错误': '#0984e3',
  '方法错误': '#6c5ce7',
};

export default function History() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [filterSubject, setFilterSubject] = useState('全部');

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

  const subjects = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => { if (q.subject) set.add(q.subject); });
    return ['全部', ...Array.from(set)];
  }, [questions]);

  const filtered = useMemo(
    () => filterSubject === '全部' ? questions : questions.filter(q => q.subject === filterSubject),
    [questions, filterSubject],
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <a href="/" style={styles.backLink}>← 返回</a>
          <h1 style={styles.title}>📋 错题本</h1>
          <div style={{ width: '60px' }} />
        </header>

        {!loading && !fetchError && questions.length > 0 && (
          <div style={styles.filterBar}>
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setFilterSubject(s)}
                style={{
                  ...styles.filterBtn,
                  ...(filterSubject === s ? styles.filterBtnActive : {}),
                }}
              >
                {s === '全部' ? '📋 全部' : s}
                {s !== '全部' && (
                  <span style={styles.filterCount}>
                    {questions.filter(q => q.subject === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

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
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🔍</div>
            <p style={styles.emptyText}>该学科暂无错题</p>
            <button onClick={() => setFilterSubject('全部')} style={styles.retryBtn}>查看全部</button>
          </div>
        ) : (
          <ul style={styles.list}>
            {filtered.map((q) => (
              <li key={q.id} style={styles.item}>
                <div
                  style={styles.itemHeader}
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                >
                  <div style={styles.itemTop}>
                    {q.is_correct != null && (
                      <span style={q.is_correct ? styles.badgeOk : styles.badgeBad}>
                        {q.is_correct ? '✅ 正确' : '❌ 错误'}
                      </span>
                    )}
                    {q.subject && q.subject !== '未分类' && (
                      <span style={styles.subjectTag}>{q.subject}</span>
                    )}
                    <span style={styles.date}>{formatDate(q.created_at)}</span>
                  </div>
                </div>

                <p style={styles.question}>{q.question || '（图片题目）'}</p>

                <div style={styles.tagRow}>
                  {q.knowledge_point && (
                    <span style={styles.tag}>📚 {q.knowledge_point}</span>
                  )}
                  {q.error_type && (
                    <span style={{
                      ...styles.tag,
                      background: ERROR_TYPE_COLORS[q.error_type] ? `${ERROR_TYPE_COLORS[q.error_type]}18` : '#eef1ff',
                      color: ERROR_TYPE_COLORS[q.error_type] || '#667eea',
                    }}>
                      {q.error_type}
                    </span>
                  )}
                </div>

                {expanded === q.id && (
                  <div style={styles.analysis}>
                    {q.image_url && (
                      <img src={q.image_url} alt="题目图片" style={styles.questionImage} />
                    )}
                    {q.error_analysis && (
                      <>
                        <div style={styles.analysisHeader}>💡 错因分析</div>
                        <MarkdownRenderer content={q.error_analysis} />
                      </>
                    )}
                    {!q.image_url && !q.error_analysis && (
                      <div style={styles.analysisHeader}>暂无详细分析</div>
                    )}
                  </div>
                )}

                <div style={styles.actions}>
                  <a href={`/redo/${q.id}`} style={styles.redoBtn}>
                    🔄 重做此题
                  </a>
                  {q.knowledge_point && (
                    <a
                      href={`/quiz?kp=${encodeURIComponent(q.knowledge_point)}`}
                      style={{ ...styles.redoBtn, background: '#27ae60' }}
                    >
                      📝 同类题测验
                    </a>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                    style={styles.expandBtn}
                  >
                    {expanded === q.id ? '收起' : '展开错因'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .markdown-body p { margin: 4px 0; line-height: 1.6; }
        .markdown-body ul, .markdown-body ol { margin: 4px 0; padding-left: 18px; }
        .markdown-body li { margin-bottom: 2px; }
        .markdown-body strong { color: #1a1a2e; }
        .markdown-body code { background: #f0f3ff; color: #667eea; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
        .markdown-body pre { background: #1a1a2e; color: #e8ecf5; padding: 10px; border-radius: 8px; overflow: auto; font-size: 12px; line-height: 1.5; }
        .markdown-body pre code { background: none; color: inherit; padding: 0; }
        .markdown-body h3, .markdown-body h4 { margin: 8px 0 4px; }
      `}</style>
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
    height: '100px', borderRadius: '14px',
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
  itemHeader: { cursor: 'pointer', marginBottom: '8px' },
  itemTop: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  badgeOk: { fontSize: '12px', fontWeight: 600, color: '#27ae60', background: '#eafaf1', padding: '2px 8px', borderRadius: '6px' },
  badgeBad: { fontSize: '12px', fontWeight: 600, color: '#d63031', background: '#fff5f5', padding: '2px 8px', borderRadius: '6px' },
  subjectTag: { fontSize: '12px', fontWeight: 600, color: '#667eea', background: '#eef1ff', padding: '2px 8px', borderRadius: '6px' },
  date: { fontSize: '12px', color: '#aaa', marginLeft: 'auto' },
  question: { margin: '0 0 8px 0', fontSize: '14px', color: '#444', lineHeight: '1.5' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' },
  tag: { fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '6px', background: '#eef1ff', color: '#667eea' },
  analysis: { marginTop: '4px', paddingTop: '12px', borderTop: '1px dashed #ddd' },
  questionImage: { width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '10px', marginBottom: '10px', background: '#f0f0f0' },
  analysisHeader: { fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' },
  analysisContent: { fontSize: '13px', color: '#555', lineHeight: '1.7' },
  actions: { display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' },
  redoBtn: {
    flex: 1, display: 'block', padding: '8px 0', fontSize: '13px', fontWeight: 600,
    color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textDecoration: 'none', borderRadius: '10px', textAlign: 'center',
  },
  expandBtn: {
    padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: '#888',
    background: '#f0f0f0', border: 'none', borderRadius: '10px', cursor: 'pointer',
  },
  filterBar: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' },
  filterBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', fontSize: '13px', fontWeight: 500,
    color: '#666', background: '#f0f0f0', border: 'none',
    borderRadius: '20px', cursor: 'pointer',
  },
  filterBtnActive: {
    color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  filterCount: {
    fontSize: '11px', fontWeight: 600, color: 'inherit', opacity: 0.7,
  },
};