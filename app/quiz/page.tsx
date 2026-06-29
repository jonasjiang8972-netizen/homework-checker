'use client';

import { useEffect, useState } from 'react';

interface KnowledgePointStat {
  name: string;
  masteryLevel: number;
  weak: boolean;
}

interface QuizQuestion {
  question: string;
  answer: string;
  hint: string;
}

interface QuizResult {
  index: number;
  correct: boolean;
  feedback: string;
}

interface QuizRecord {
  id: string;
  knowledge_point: string;
  questions_json: QuizQuestion[];
  answers_json: string[] | null;
  score: number | null;
  total: number | null;
  passed: boolean | null;
  created_at: string;
}

export default function Quiz() {
  const [weakPoints, setWeakPoints] = useState<KnowledgePointStat[]>([]);
  const [selectedKp, setSelectedKp] = useState('');
  const [customKp, setCustomKp] = useState('');

  const [record, setRecord] = useState<QuizRecord | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [grade, setGrade] = useState<{ results: QuizResult[]; score: number; total: number; summary: string } | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);

  const [loadingKp, setLoadingKp] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<QuizRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchWeakPoints();
    fetchHistory();
    const params = new URLSearchParams(window.location.search);
    const kp = params.get('kp');
    if (kp) {
      setSelectedKp(kp);
      handleGenerate(kp);
    }
  }, []);

  const fetchWeakPoints = async () => {
    setLoadingKp(true);
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      setWeakPoints(json.stats || []);
    } catch {}
    setLoadingKp(false);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/quiz');
      const json = await res.json();
      setHistory(json.records || []);
    } catch {}
    setLoadingHistory(false);
  };

  const handleGenerate = async (kp: string) => {
    setGenerating(true);
    setError('');
    setGrade(null);
    setPassed(null);
    setAnswers([]);
    setRecord(null);
    setQuestions([]);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_point: kp }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else if (json.record) {
        setRecord(json.record);
        setQuestions(json.record.questions_json || []);
        setAnswers(new Array((json.record.questions_json || []).length).fill(''));
      }
    } catch {
      setError('网络错误，请重试');
    }
    setGenerating(false);
  };

  const handleSubmit = async () => {
    if (!record) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', id: record.id, answers }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setGrade(json.grade);
        setPassed(json.passed);
        fetchHistory();
        fetchWeakPoints();
      }
    } catch {
      setError('网络错误，请重试');
    }
    setSubmitting(false);
  };

  const resetQuiz = () => {
    setRecord(null);
    setQuestions([]);
    setAnswers([]);
    setGrade(null);
    setPassed(null);
    setError('');
  };

  const effectiveKp = customKp.trim() || selectedKp;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <a href="/" style={styles.backLink}>← 返回</a>
          <h1 style={styles.title}>📝 知识点测验</h1>
          <div style={{ width: '60px' }} />
        </header>

        {grade ? (
          <div style={styles.resultCard}>
            <div style={passed ? styles.verdictOk : styles.verdictBad}>
              {passed ? '🎉 测验通过！' : '💪 继续加油！'}
            </div>
            <div style={styles.scoreDisplay}>
              <span style={styles.scoreNum}>{grade.score}</span>
              <span style={styles.scoreSep}>/</span>
              <span style={styles.scoreTotal}>{grade.total}</span>
            </div>
            <p style={styles.summary}>{grade.summary}</p>
            <div style={styles.resultList}>
              {grade.results.map(r => (
                <div key={r.index} style={{ ...styles.resultItem, background: r.correct ? '#eafaf1' : '#fff5f5' }}>
                  <span>{r.correct ? '✅' : '❌'} 第{r.index + 1}题</span>
                  <span style={{ color: r.correct ? '#27ae60' : '#d63031', fontSize: '13px' }}>{r.feedback}</span>
                </div>
              ))}
            </div>
            <button onClick={resetQuiz} style={styles.retryBtn}>再测一次</button>
          </div>
        ) : questions.length > 0 ? (
          <div>
            <div style={styles.quizHeader}>
              <span style={styles.quizKp}>🎯 {record?.knowledge_point}</span>
              <span style={styles.quizCount}>共 {questions.length} 题</span>
            </div>
            {questions.map((q, i) => (
              <div key={i} style={styles.questionCard}>
                <div style={styles.questionNum}>第{i + 1}题</div>
                <div style={styles.questionText}>{q.question}</div>
                <input
                  type="text"
                  placeholder="输入你的答案..."
                  value={answers[i] || ''}
                  onChange={e => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  style={styles.answerInput}
                />
                <button
                  onClick={() => {
                    if (q.hint) alert(q.hint);
                  }}
                  style={styles.hintBtn}
                >💡 提示</button>
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ ...styles.submitBtn, ...(submitting ? styles.btnDisabled : {}) }}
            >
              {submitting ? (
                <span style={styles.loadingRow}>
                  <span style={styles.spinner} />
                  AI 批改中...
                </span>
              ) : '📝 提交测验'}
            </button>
          </div>
        ) : (
          <div>
            <p style={styles.sectionLabel}>选择知识点，AI 出题测验</p>

            {error && <div style={styles.errorBox}>⚠️ {error}</div>}

            {loadingKp ? (
              <div style={styles.skeletonList}>
                {[0, 1].map(i => <div key={i} style={styles.skeletonItem} />)}
              </div>
            ) : weakPoints.length === 0 ? (
              <div style={styles.emptyHint}>暂无薄弱知识点，多批改几道题再测</div>
            ) : (
              <div style={styles.kpList}>
                {weakPoints.map(kp => (
                  <button
                    key={kp.name}
                    onClick={() => { setSelectedKp(kp.name); handleGenerate(kp.name); }}
                    style={{
                      ...styles.kpBtn,
                      ...(selectedKp === kp.name ? styles.kpBtnActive : {}),
                    }}
                  >
                    <span>{kp.name}</span>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>掌握度 {kp.masteryLevel}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={styles.customSection}>
              <div style={styles.divider}>
                <span style={styles.dividerText}>或输入其他知识点</span>
              </div>
              <div style={styles.customRow}>
                <input
                  type="text"
                  placeholder="输入知识点名称"
                  value={customKp}
                  onChange={e => setCustomKp(e.target.value)}
                  style={styles.customInput}
                />
                <button
                  onClick={() => customKp.trim() && handleGenerate(customKp.trim())}
                  disabled={!customKp.trim() || generating}
                  style={{ ...styles.generateBtn, ...((!customKp.trim() || generating) ? styles.btnDisabled : {}) }}
                >
                  {generating ? (
                    <span style={styles.loadingRow}>
                      <span style={styles.spinner} />
                      AI 出题...
                    </span>
                  ) : '✨ 出题'}
                </button>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div style={styles.historySection}>
            <div style={styles.sectionLabel}>📋 测验记录</div>
            {loadingHistory ? (
              <div style={{ ...styles.skeletonItem, height: '40px', marginBottom: '8px' }} />
            ) : (
              history.slice(0, 5).map(r => (
                <div key={r.id} style={styles.historyItem}>
                  <span style={styles.historyKp}>{r.knowledge_point}</span>
                  {r.score != null ? (
                    <span style={{ ...styles.historyScore, color: r.passed ? '#27ae60' : '#d63031' }}>
                      {r.score}/{r.total}
                    </span>
                  ) : (
                    <span style={styles.historyPending}>未完成</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { maxWidth: '480px', margin: '0 auto', background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' },
  backLink: { color: '#667eea', textDecoration: 'none', fontSize: '14px', width: '60px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  sectionLabel: { fontSize: '14px', fontWeight: 600, color: '#555', marginBottom: '12px' },
  emptyHint: { textAlign: 'center', color: '#aaa', fontSize: '14px', padding: '24px' },
  errorBox: { marginBottom: '14px', padding: '14px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '12px', color: '#d63031', fontSize: '14px' },

  kpList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' },
  kpBtn: { flex: '1 1 calc(50% - 4px)', padding: '12px', fontSize: '13px', fontWeight: 500, background: '#f8f9fc', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', color: '#333' },
  kpBtnActive: { borderColor: '#667eea', background: '#eef1ff' },

  customSection: { marginTop: '4px' },
  divider: { textAlign: 'center', marginBottom: '12px', position: 'relative' },
  dividerText: { fontSize: '12px', color: '#aaa', background: 'white', padding: '0 10px' },
  customRow: { display: 'flex', gap: '8px' },
  customInput: { flex: 1, padding: '10px 12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '10px', outline: 'none' },
  generateBtn: { padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },

  loadingRow: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
  spinner: { width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  skeletonItem: { height: '56px', borderRadius: '14px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },

  quizHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '10px 14px', background: '#eef1ff', borderRadius: '10px' },
  quizKp: { fontSize: '14px', fontWeight: 600, color: '#667eea' },
  quizCount: { fontSize: '13px', color: '#888' },

  questionCard: { padding: '16px', background: '#f8f9fc', borderRadius: '14px', marginBottom: '12px', border: '1px solid #eee' },
  questionNum: { fontSize: '12px', fontWeight: 700, color: '#667eea', marginBottom: '6px' },
  questionText: { fontSize: '15px', color: '#333', lineHeight: '1.6', marginBottom: '10px' },
  answerInput: { width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' },
  hintBtn: { marginTop: '8px', padding: '4px 10px', fontSize: '12px', color: '#667eea', background: '#eef1ff', border: 'none', borderRadius: '8px', cursor: 'pointer' },

  submitBtn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '8px' },

  resultCard: { padding: '20px', background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf5 100%)', borderRadius: '16px', textAlign: 'center' },
  verdictOk: { fontSize: '20px', fontWeight: 700, color: '#27ae60', marginBottom: '14px', padding: '12px', background: '#eafaf1', borderRadius: '12px' },
  verdictBad: { fontSize: '20px', fontWeight: 700, color: '#d63031', marginBottom: '14px', padding: '12px', background: '#fff5f5', borderRadius: '12px' },
  scoreDisplay: { marginBottom: '10px' },
  scoreNum: { fontSize: '48px', fontWeight: 800, color: '#1a1a2e' },
  scoreSep: { fontSize: '24px', color: '#aaa', margin: '0 4px' },
  scoreTotal: { fontSize: '24px', color: '#aaa' },
  summary: { fontSize: '14px', color: '#555', lineHeight: '1.5', marginBottom: '16px' },
  resultList: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', textAlign: 'left' },
  resultItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', alignItems: 'center' },
  retryBtn: { padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer' },

  historySection: { marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8f9fc', borderRadius: '10px', marginBottom: '8px' },
  historyKp: { fontSize: '13px', fontWeight: 500, color: '#333' },
  historyScore: { fontSize: '13px', fontWeight: 700 },
  historyPending: { fontSize: '12px', color: '#aaa' },
};