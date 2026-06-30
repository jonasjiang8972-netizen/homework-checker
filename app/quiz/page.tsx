'use client';

import { useEffect, useState } from 'react';
import { IconBrain, IconTarget, IconCheck, IconX, IconClipboard, IconAlertTriangle } from '../../lib/icons';

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
  knowledge_point?: string;
  error_analysis?: string;
  guidance?: string;
  correct_solution?: string;
}

interface QuizGrade {
  results: QuizResult[];
  score: number;
  total: number;
  summary: string;
}

interface QuizRecord {
  id: string;
  knowledge_point: string;
  subject?: string;
  questions_json: QuizQuestion[];
  answers_json: string[] | null;
  score: number | null;
  total: number | null;
  passed: boolean | null;
  created_at: string;
}

const SUBJECT_ICONS: Record<string, string> = {
  '数学': '📐',
  '语文': '📖',
  '英语': '🔤',
  '其他': '📚',
};

export default function Quiz() {
  const [weakPoints, setWeakPoints] = useState<KnowledgePointStat[]>([]);
  const [selectedKp, setSelectedKp] = useState('');
  const [customKp, setCustomKp] = useState('');
  const [subject, setSubject] = useState('数学');

  const [record, setRecord] = useState<QuizRecord | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [grade, setGrade] = useState<QuizGrade | null>(null);
  const [correctedResults, setCorrectedResults] = useState<QuizResult[] | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);

  const [loadingKp, setLoadingKp] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<QuizRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchWeakPoints();
    fetchHistory();
    fetchSettings();
    const params = new URLSearchParams(window.location.search);
    const kp = params.get('kp');
    if (kp) {
      setSelectedKp(kp);
      handleGenerate(kp);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      const json = await res.json();
      if (json.defaultSubject) setSubject(json.defaultSubject);
    } catch {}
  };

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
    setCorrectedResults(null);
    setPassed(null);
    setAnswers([]);
    setRecord(null);
    setQuestions([]);
    try {
      const savedModel = typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null;
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_point: kp, model: savedModel || undefined, subject }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else if (json.record) {
        setRecord(json.record);
        const qs = json.record.questions_json || [];
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(''));
        if (json.record.subject) setSubject(json.record.subject);
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
      const savedModel = typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null;
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', id: record.id, answers, model: savedModel || undefined }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setGrade(json.grade);
        setCorrectedResults(json.grade.results);
        setPassed(json.passed);
        fetchHistory();
        fetchWeakPoints();
      }
    } catch {
      setError('网络错误，请重试');
    }
    setSubmitting(false);
  };

  const toggleCorrection = (index: number) => {
    if (!correctedResults) return;
    const next = correctedResults.map(r =>
      r.index === index ? { ...r, correct: !r.correct } : r
    );
    setCorrectedResults(next);
  };

  const handleSaveCorrection = async () => {
    if (!record || !correctedResults) return;
    setCorrecting(true);
    try {
      const corrections = correctedResults.map(r => ({ index: r.index, correct: r.correct }));
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'correct', id: record.id, corrections }),
      });
      const json = await res.json();
      if (json.ok) {
        setGrade({ ...grade!, results: correctedResults, score: json.score, total: json.total });
        setPassed(json.passed);
        fetchHistory();
        fetchWeakPoints();
      }
    } catch {}
    setCorrecting(false);
  };

  const resetQuiz = () => {
    setRecord(null);
    setQuestions([]);
    setAnswers([]);
    setGrade(null);
    setCorrectedResults(null);
    setPassed(null);
    setError('');
  };

  const displayResults = correctedResults || grade?.results || [];
  const displayScore = correctedResults
    ? correctedResults.filter(r => r.correct).length
    : (grade?.score ?? 0);
  const displayTotal = grade?.total ?? 0;
  const displayPassed = passed;

  const effectiveKp = customKp.trim() || selectedKp;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>闯关挑战 🎯</h1>
        <span style={styles.subjectBadge}>{SUBJECT_ICONS[subject] || '📚'} {subject}</span>
      </div>

      {grade && displayResults.length > 0 ? (
        <div style={styles.resultCard}>
          <div style={displayPassed ? styles.verdictOk : styles.verdictBad}>
            {displayPassed ? (
              <span style={styles.verdictRow}><IconCheck /> 闯关成功 🎉</span>
            ) : (
              <span style={styles.verdictRow}><IconAlertTriangle /> 差一点点，再试一次</span>
            )}
          </div>
          <div style={styles.scoreDisplay}>
            <span style={styles.scoreNum}>{displayScore}</span>
            <span style={styles.scoreSep}>/</span>
            <span style={styles.scoreTotal}>{displayTotal}</span>
          </div>
          <p style={styles.summary}>{grade?.summary}</p>

          <div style={styles.resultList}>
            {displayResults.map(r => (
              <div key={r.index} style={styles.resultItem}>
                <div style={{ ...styles.resultHeader, background: r.correct ? '#eafaf1' : '#fff5f5' }}>
                  <span style={styles.resultRow}>
                    {r.correct ? <IconCheck /> : <IconX />}
                    第{r.index + 1}题
                  </span>
                  <button
                    onClick={() => toggleCorrection(r.index)}
                    style={styles.correctBtn}
                    title="批改有误？点击切换"
                  >
                    {r.correct ? '✅' : '❌'} 纠正
                  </button>
                </div>
                <div style={styles.resultDetail}>
                  <div style={styles.resultFeedback}>{r.feedback}</div>
                  {!r.correct && r.error_analysis && (
                    <div style={styles.detailLine}><strong>错因：</strong>{r.error_analysis}</div>
                  )}
                  {!r.correct && r.guidance && (
                    <div style={styles.detailLine}><strong>提示：</strong>{r.guidance}</div>
                  )}
                  {!r.correct && r.correct_solution && (
                    <div style={styles.detailLine}><strong>正确解法：</strong>{r.correct_solution}</div>
                  )}
                  {r.knowledge_point && (
                    <div style={styles.detailLine}><strong>知识点：</strong>{r.knowledge_point}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.resultActions}>
            {correctedResults && correctedResults.some((r, i) => r.correct !== grade?.results[i]?.correct) && (
              <button
                onClick={handleSaveCorrection}
                disabled={correcting}
                style={{ ...styles.saveBtn, ...(correcting ? styles.btnDisabled : {}) }}
              >
                {correcting ? '保存中...' : '保存纠正'}
              </button>
            )}
            <button onClick={resetQuiz} style={styles.retryBtn}>再测一次</button>
          </div>
        </div>
      ) : questions.length > 0 ? (
        <div>
          <div style={styles.quizHeader}>
            <span style={styles.quizKp}>{record?.knowledge_point}</span>
            <span style={styles.quizCount}>共 {questions.length} 题</span>
          </div>
          {error && <div style={styles.errorBox}>{error}</div>}
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
                onClick={() => { if (q.hint) alert(q.hint); }}
                style={styles.hintBtn}
              >提示</button>
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
            ) : '提交测验'}
          </button>
        </div>
      ) : (
        <div>
          <p style={styles.sectionLabel}>选择一个知识点来挑战</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          {loadingKp ? (
            <div style={styles.skeletonList}>
              {[0, 1].map(i => <div key={i} style={styles.skeletonItem} />)}
            </div>
          ) : (
            <div>
              {weakPoints.filter(kp => kp.weak).length > 0 && (
                <div style={styles.weakSection}>
                  <div style={styles.sectionLabel}><IconAlertTriangle /> 还需要多练练</div>
                  <div style={styles.kpList}>
                    {weakPoints.filter(kp => kp.weak).map(kp => (
                      <button
                        key={kp.name}
                        onClick={() => { setSelectedKp(kp.name); handleGenerate(kp.name); }}
                        disabled={generating}
                        style={{
                          ...styles.kpBtn,
                          ...(selectedKp === kp.name ? styles.kpBtnActive : {}),
                          ...(generating ? styles.btnDisabled : {}),
                        }}
                      >
                        <span style={styles.kpName}>{kp.name}</span>
                        <span style={styles.kpMastery}>目前进度 {kp.masteryLevel}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {weakPoints.filter(kp => !kp.weak).length > 0 && (
                <div style={styles.otherSection}>
                  <div style={styles.sectionLabel}>其他知识点</div>
                  <div style={styles.kpList}>
                    {weakPoints.filter(kp => !kp.weak).map(kp => (
                      <button
                        key={kp.name}
                        onClick={() => { setSelectedKp(kp.name); handleGenerate(kp.name); }}
                        disabled={generating}
                        style={{
                          ...styles.kpBtn,
                          ...(selectedKp === kp.name ? styles.kpBtnActive : {}),
                          ...(generating ? styles.btnDisabled : {}),
                        }}
                      >
                        <span style={styles.kpName}>{kp.name}</span>
                        <span style={styles.kpMastery}>目前进度 {kp.masteryLevel}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {weakPoints.length === 0 && (
                <div style={styles.emptyHint}>还没有挑战过知识点，先去做几道题吧</div>
              )}
            </div>
          )}

          <div style={styles.customSection}>
            <div style={styles.divider}>
              <span style={styles.dividerText}>或者自己输入一个知识点</span>
            </div>
            <div style={styles.customRow}>
              <input
                type="text"
                placeholder="输入知识点的名字"
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
                ) : '出题'}
              </button>
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && !grade && questions.length === 0 && (
        <div style={styles.historySection}>
          <div style={styles.sectionLabel}><IconClipboard /> 挑战记录</div>
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
                  <span style={styles.historyPending}>还没做</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px', background: '#f8f9fc', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  subjectBadge: { fontSize: '12px', fontWeight: 600, color: '#4f6ef7', background: '#eef1ff', padding: '4px 10px', borderRadius: '8px' },
  sectionLabel: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '10px' },
  emptyHint: { textAlign: 'center', color: '#aaa', fontSize: '14px', padding: '24px' },
  errorBox: { marginBottom: '12px', padding: '12px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '10px', color: '#d63031', fontSize: '13px' },

  weakSection: { marginBottom: '16px' },
  otherSection: { marginBottom: '16px' },
  kpList: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  kpBtn: { flex: '1 1 calc(50% - 4px)', padding: '12px', fontSize: '13px', fontWeight: 500, background: 'white', border: '1px solid #eef0f4', borderRadius: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', color: '#333' },
  kpBtnActive: { borderColor: '#4f6ef7', background: '#eef1ff' },
  kpName: { fontSize: '13px', fontWeight: 600 },
  kpMastery: { fontSize: '11px', color: '#8e95a2' },

  customSection: { marginTop: '8px' },
  divider: { textAlign: 'center', marginBottom: '12px', position: 'relative', borderTop: '1px solid #eef0f4', paddingTop: '16px' },
  dividerText: { fontSize: '12px', color: '#8e95a2', background: '#f8f9fc', padding: '0 10px' },
  customRow: { display: 'flex', gap: '8px' },
  customInput: { flex: 1, padding: '10px 12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '10px', outline: 'none' },
  generateBtn: { padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },

  loadingRow: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
  spinner: { width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  skeletonItem: { height: '56px', borderRadius: '12px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },

  quizHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '10px 14px', background: '#eef1ff', borderRadius: '10px' },
  quizKp: { fontSize: '13px', fontWeight: 600, color: '#4f6ef7' },
  quizCount: { fontSize: '12px', color: '#8e95a2' },

  questionCard: { padding: '14px', background: 'white', borderRadius: '12px', marginBottom: '10px', border: '1px solid #eef0f4' },
  questionNum: { fontSize: '11px', fontWeight: 700, color: '#4f6ef7', marginBottom: '6px' },
  questionText: { fontSize: '14px', color: '#333', lineHeight: '1.6', marginBottom: '10px' },
  answerInput: { width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' },
  hintBtn: { marginTop: '6px', padding: '4px 10px', fontSize: '11px', color: '#4f6ef7', background: '#eef1ff', border: 'none', borderRadius: '6px', cursor: 'pointer' },

  submitBtn: { width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '10px', cursor: 'pointer', marginTop: '8px' },

  resultCard: { padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  verdictRow: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
  verdictOk: { fontSize: '18px', fontWeight: 700, color: '#27ae60', marginBottom: '14px', padding: '12px', background: '#eafaf1', borderRadius: '10px', textAlign: 'center' },
  verdictBad: { fontSize: '18px', fontWeight: 700, color: '#d63031', marginBottom: '14px', padding: '12px', background: '#fff5f5', borderRadius: '10px', textAlign: 'center' },
  scoreDisplay: { textAlign: 'center', marginBottom: '10px' },
  scoreNum: { fontSize: '42px', fontWeight: 800, color: '#1a1a2e' },
  scoreSep: { fontSize: '22px', color: '#aaa', margin: '0 4px' },
  scoreTotal: { fontSize: '22px', color: '#aaa' },
  summary: { textAlign: 'center', fontSize: '13px', color: '#555', lineHeight: '1.5', marginBottom: '14px' },

  resultList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' },
  resultItem: { borderRadius: '10px', border: '1px solid #eef0f4', overflow: 'hidden' },
  resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', fontSize: '13px' },
  resultRow: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 },
  correctBtn: { fontSize: '11px', padding: '2px 8px', borderRadius: '6px', border: '1px solid #d0d8f0', background: 'white', color: '#4f6ef7', cursor: 'pointer' },
  resultDetail: { padding: '10px 14px', background: '#fafbfc', fontSize: '12px', lineHeight: '1.6' },
  resultFeedback: { color: '#555', marginBottom: '6px' },
  detailLine: { color: '#666', marginTop: '4px' },

  resultActions: { display: 'flex', gap: '8px', justifyContent: 'center' },
  saveBtn: { padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: 'white', background: '#e67e22', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  retryBtn: { padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '8px', cursor: 'pointer' },

  historySection: { marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eef0f4' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'white', borderRadius: '8px', marginBottom: '6px', border: '1px solid #eef0f4' },
  historyKp: { fontSize: '12px', fontWeight: 500, color: '#333' },
  historyScore: { fontSize: '12px', fontWeight: 700 },
  historyPending: { fontSize: '11px', color: '#8e95a2' },
};
