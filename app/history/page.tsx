'use client';

import { useEffect, useState, useMemo } from 'react';
import { MarkdownRenderer } from '../../lib/markdown-renderer';
import { IconCheck, IconX, IconFileText, IconHistory } from '../../lib/icons';

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
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterError, setFilterError] = useState('all');
  const [filterErrorType, setFilterErrorType] = useState('all');
  const [mode, setMode] = useState<'student' | 'parent'>('student');
  const [modeLoaded, setModeLoaded] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchMode();
  }, [sortBy, sortOrder, filterSubject, filterError, filterErrorType]);

  const fetchMode = async () => {
    try {
      const res = await fetch('/api/user/settings');
      const json = await res.json();
      if (json.mode) setMode(json.mode);
    } catch {}
    setModeLoaded(true);
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set('sort_by', sortBy);
    params.set('order', sortOrder);
    if (filterSubject !== '全部') params.set('filter_subject', filterSubject);
    if (filterError !== 'all') params.set('filter_error', filterError);
    if (filterErrorType !== 'all') params.set('filter_error_type', filterErrorType);
    return params.toString();
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`/api/questions?${buildQuery()}`);
      const json = await res.json();
      if (json.error) {
        setFetchError(json.error);
        setQuestions([]);
      } else {
        setQuestions(json.data || []);
      }
    } catch {
       setFetchError('加载失败了，检查一下网络吧');
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

  const totalCount = questions.length;
  const correctCount = questions.filter(q => q.is_correct === true).length;
  const wrongCount = questions.filter(q => q.is_correct === false).length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>我的成长日记</h1>
      </div>

      {!loading && !fetchError && questions.length > 0 && (
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{totalCount}</span>
            <span style={styles.statLabel}>一共做了</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ ...styles.statNum, color: '#27ae60' }}>{correctCount}</span>
            <span style={styles.statLabel}>学会了 ✅</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ ...styles.statNum, color: '#d63031' }}>{wrongCount}</span>
            <span style={styles.statLabel}>继续加油</span>
          </div>
        </div>
      )}

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
              {s}
              {s !== '全部' && (
                <span style={styles.filterCount}>
                  {questions.filter(q => q.subject === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && !fetchError && questions.length > 0 && (
        <div style={styles.sortBar}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={styles.sortSelect}
          >
            <option value="created_at">按时间</option>
            <option value="knowledge_point">按知识点</option>
            <option value="subject">按学科</option>
          </select>
          <button
            onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
            style={styles.sortDirBtn}
          >
            {sortOrder === 'desc' ? '↓ 最新' : '↑ 最早'}
          </button>
          <select
            value={filterError}
            onChange={e => setFilterError(e.target.value)}
            style={{ ...styles.sortSelect, flex: 1 }}
          >
            <option value="all">全部状态</option>
            <option value="correct">学会了 ✅</option>
            <option value="wrong">需要复习</option>
          </select>
        </div>
      )}

      {!loading && !fetchError && questions.length > 0 && (
        <div style={styles.errorTypeBar}>
          {['全部类型', '计算失误', '概念不清', '审题错误', '方法错误'].map(t => (
            <button
              key={t}
              onClick={() => setFilterErrorType(t === '全部类型' ? 'all' : t)}
              style={{
                ...styles.errorTypeBtn,
                ...((filterErrorType === 'all' && t === '全部类型') || filterErrorType === t ? styles.errorTypeBtnActive : {}),
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
        <div style={styles.skeletonList}>
          {[0, 1, 2].map((i) => <div key={i} style={styles.skeletonItem} />)}
        </div>
      ) : fetchError ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><IconFileText /></div>
          <p style={styles.emptyText}>{fetchError}</p>
          <button onClick={fetchQuestions} style={styles.primaryBtn}>重试</button>
        </div>
      ) : questions.length === 0 && filterSubject === '全部' && filterError === 'all' ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><IconHistory /></div>
            <p style={styles.emptyText}>还没有做过题呢</p>
          <a href="/" style={styles.primaryBtn}>去试试吧 ✨</a>
        </div>
      ) : mode === 'student' ? (
        /* 学生模式：只看汇总趋势，不暴露单题细节 */
        <div style={styles.studentView}>
          <div style={styles.studentSummary}>
            <div style={styles.studentStat}>
              <span style={styles.studentNum}>{totalCount}</span>
              <span style={styles.studentLabel}>总共做题</span>
            </div>
            <div style={styles.studentStat}>
              <span style={{ ...styles.studentNum, color: '#27ae60' }}>{totalCount > 0 ? Math.round(correctCount / totalCount * 100) : 0}%</span>
              <span style={styles.studentLabel}>正确率</span>
            </div>
            <div style={styles.studentStat}>
              <span style={{ ...styles.studentNum, color: '#4f6ef7' }}>{questions.filter(q => q.grading?.knowledge_tags?.length).length}</span>
              <span style={styles.studentLabel}>涉及知识点</span>
            </div>
          </div>

          <div style={styles.studentSectionTitle}>薄弱知识点</div>
          {(() => {
            const weakKps = [...new Set(questions
              .filter(q => q.is_correct === false && q.knowledge_point)
              .map(q => q.knowledge_point!))];
            return weakKps.length > 0 ? (
              <div style={styles.weakTags}>
                {weakKps.map((kp, i) => (
                  <span key={i} style={styles.weakTag}>{kp}</span>
                ))}
              </div>
            ) : (
              <p style={styles.studentNone}>暂无薄弱点，继续保持！</p>
            );
          })()}

          <div style={styles.studentSectionTitle}>最近记录</div>
          <ul style={styles.list}>
            {questions.slice(0, 20).map((q) => (
              <li key={q.id} style={styles.studentItem}>
                <div style={styles.itemTop}>
                  {q.is_correct != null && (
                    <span style={q.is_correct ? styles.badgeOk : styles.badgeBad}>
                      {q.is_correct ? '✅' : '❌'}
                    </span>
                  )}
                  {q.subject && q.subject !== '未分类' && (
                    <span style={styles.subjectTag}>{q.subject}</span>
                  )}
                  {q.knowledge_point && (
                    <span style={styles.tag}>{q.knowledge_point}</span>
                  )}
                  <span style={styles.date}>{formatDate(q.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul style={styles.list}>
          {questions.map((q) => (
            <li key={q.id} style={styles.item}>
              <div
                style={styles.itemHeader}
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}
              >
                <div style={styles.itemTop}>
                  {q.is_correct != null && (
                    <span style={q.is_correct ? styles.badgeOk : styles.badgeBad}>
                      {q.is_correct ? '学会了 ✅' : '需要复习'}
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
                  <span style={styles.tag}>{q.knowledge_point}</span>
                )}
                {q.error_type && (
                  <span style={{
                    ...styles.tag,
                    background: ERROR_TYPE_COLORS[q.error_type] ? `${ERROR_TYPE_COLORS[q.error_type]}18` : '#eef1ff',
                    color: ERROR_TYPE_COLORS[q.error_type] || '#4f6ef7',
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
                      <div style={styles.analysisHeader}>来看看</div>
                      <MarkdownRenderer content={q.error_analysis} />
                    </>
                  )}
                  {!q.image_url && !q.error_analysis && (
                    <div style={styles.analysisHeader}>没有更多内容</div>
                  )}
                </div>
              )}

              <div style={styles.actions}>
                <a href={`/redo/${q.id}`} style={styles.redoBtn}>
                  再做一次
                </a>
                {q.knowledge_point && (
                  <a
                    href={`/quiz?kp=${encodeURIComponent(q.knowledge_point)}`}
                    style={{ ...styles.redoBtn, background: '#27ae60' }}
                  >
                    做同类题
                  </a>
                )}
                <button
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                  style={styles.expandBtn}
                >
                  {expanded === q.id ? '收起' : '展开'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .markdown-body p { margin: 4px 0; line-height: 1.6; }
        .markdown-body ul, .markdown-body ol { margin: 4px 0; padding-left: 18px; }
        .markdown-body li { margin-bottom: 2px; }
        .markdown-body strong { color: #1a1a2e; }
        .markdown-body code { background: #f0f3ff; color: #4f6ef7; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
        .markdown-body pre { background: #1a1a2e; color: #e8ecf5; padding: 10px; border-radius: 8px; overflow: auto; font-size: 12px; line-height: 1.5; }
        .markdown-body pre code { background: none; color: inherit; padding: 0; }
        .markdown-body h3, .markdown-body h4 { margin: 8px 0 4px; }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px', background: '#f8f9fc', minHeight: '100vh' },
  header: { marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  statsRow: { display: 'flex', gap: '10px', marginBottom: '16px' },
  statItem: { flex: 1, textAlign: 'center', padding: '10px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  statNum: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e' },
  statLabel: { fontSize: '11px', color: '#8e95a2', marginTop: '2px' },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  skeletonItem: { height: '100px', borderRadius: '12px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },
  emptyState: { textAlign: 'center', padding: '48px 20px' },
  emptyIcon: { width: '48px', height: '48px', margin: '0 auto 12px', color: '#c0c4cc' },
  emptyText: { color: '#8e95a2', marginBottom: '16px', fontSize: '14px' },
  primaryBtn: { display: 'inline-block', padding: '10px 24px', background: '#4f6ef7', color: 'white', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
  item: { padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  itemHeader: { cursor: 'pointer', marginBottom: '6px' },
  itemTop: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  badgeOk: { fontSize: '11px', fontWeight: 600, color: '#27ae60', background: '#eafaf1', padding: '2px 8px', borderRadius: '6px' },
  badgeBad: { fontSize: '11px', fontWeight: 600, color: '#d63031', background: '#fff5f5', padding: '2px 8px', borderRadius: '6px' },
  subjectTag: { fontSize: '11px', fontWeight: 600, color: '#4f6ef7', background: '#eef1ff', padding: '2px 8px', borderRadius: '6px' },
  date: { fontSize: '11px', color: '#aaa', marginLeft: 'auto' },
  question: { margin: '0 0 6px 0', fontSize: '13px', color: '#444', lineHeight: '1.5' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' },
  tag: { fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '6px', background: '#eef1ff', color: '#4f6ef7' },
  analysis: { marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed #ddd' },
  questionImage: { width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', marginBottom: '8px', background: '#f0f0f0' },
  analysisHeader: { fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' },
  actions: { display: 'flex', gap: '6px', marginTop: '10px', alignItems: 'center' },
  redoBtn: { flex: 1, display: 'block', padding: '8px 0', fontSize: '12px', fontWeight: 600, color: 'white', background: '#4f6ef7', textDecoration: 'none', borderRadius: '8px', textAlign: 'center' },
  expandBtn: { padding: '8px 12px', fontSize: '12px', fontWeight: 500, color: '#8e95a2', background: '#f0f2f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  filterBar: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' },
  sortBar: { display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' },
  sortSelect: { fontSize: '12px', fontWeight: 500, padding: '6px 10px', borderRadius: '8px', border: '1px solid #e0e4ee', color: '#555', background: 'white', cursor: 'pointer', outline: 'none' },
  sortDirBtn: { padding: '6px 12px', fontSize: '12px', fontWeight: 500, color: '#4f6ef7', background: '#eef1ff', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', fontSize: '12px', fontWeight: 500, color: '#666', background: '#f0f2f5', border: 'none', borderRadius: '20px', cursor: 'pointer' },
  filterBtnActive: { color: 'white', background: '#4f6ef7' },
  filterCount: { fontSize: '10px', fontWeight: 600, color: 'inherit', opacity: 0.7 },
  studentView: { padding: '0' },
  studentSummary: { display: 'flex', gap: '10px', marginBottom: '16px' },
  studentStat: { flex: 1, textAlign: 'center', padding: '12px 8px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  studentNum: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e' },
  studentLabel: { fontSize: '11px', color: '#8e95a2', marginTop: '2px' },
  studentSectionTitle: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px', marginTop: '4px' },
  studentItem: { padding: '10px 14px', background: 'white', borderRadius: '10px', border: '1px solid #eef0f4', marginBottom: '6px' },
  weakTags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' },
  weakTag: { fontSize: '12px', fontWeight: 500, padding: '4px 10px', borderRadius: '8px', background: '#fff5f5', color: '#d63031', border: '1px solid #ffd5d5' },
  studentNone: { fontSize: '13px', color: '#8e95a2', marginBottom: '16px' },
  errorTypeBar: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' },
  errorTypeBtn: { padding: '4px 10px', fontSize: '11px', fontWeight: 500, color: '#666', background: '#f0f2f5', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  errorTypeBtnActive: { color: 'white', background: '#4f6ef7' },
};
