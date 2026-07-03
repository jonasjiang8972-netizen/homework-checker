'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { GradingResult } from '../lib/grading';
import { MarkdownRenderer } from '../lib/markdown-renderer';
import { ModelSelector } from './components/ModelSelector';
import { IconCamera, IconCheck, IconX } from '../lib/icons';
import { preprocessImage } from '../lib/image-preprocess';
import { ocrImageClient, isOcrReliable } from '../lib/ocr-client';
import { splitQuestions, estimateTime } from '../lib/question-splitter';
import { QuestionSelector } from './components/QuestionSelector';

const SUBJECTS = ['数学', '语文', '英语', '其他'];

export default function Home() {
  const { data: session, status } = useSession();
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [slowWarning, setSlowWarning] = useState(false);
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [subject, setSubject] = useState('数学');
  const [detectedQuestions, setDetectedQuestions] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [batchResults, setBatchResults] = useState<GradingResult[]>([]);
  const [estimatedLabel, setEstimatedLabel] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cancelRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    cancelRef.current?.abort();
  }, []);

  const startTimer = () => {
    setElapsed(0); setSlowWarning(false);
    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        if (t === 25) setSlowWarning(true);
        return t + 1;
      });
    }, 1000);
  };
  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = fileRef.current;
    const rawFile = fileInput?.files?.[0];
    if (!rawFile) return;

    cancelRef.current = new AbortController();
    setLoading(true); setGrading(null); setError(''); setSaved(false); setSlowWarning(false);
    setSavedQuestionId(null);
    startTimer();

    try {
      setLoadingDetail('正在优化图片...');
      const processed = await preprocessImage(rawFile);

      setLoadingDetail('正在识别文字...');
      let ocrText: string | null = null;
      try {
        const ocrResult = await Promise.race([
          ocrImageClient(processed.blob),
          new Promise<never>((_, r) => setTimeout(() => r(new Error('OCR timeout')), 12000)),
        ]);
        if (isOcrReliable(ocrResult)) {
          ocrText = ocrResult.text;
        }
      } catch {}

      if (cancelRef.current.signal.aborted) return;

      const model = (typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null) || '';

      if (ocrText && ocrText.trim().length > 5) {
        const split = splitQuestions(ocrText);
        if (split.questions.length > 1) {
          setDetectedQuestions(split.questions);
          setEstimatedLabel(estimateTime(split.questions.length).label);
          setShowSelector(true);
          setLoading(false);
          stopTimer();
          return;
        }
      }

      const formData = new FormData();
      formData.append('image', processed.blob, rawFile.name);
      if (ocrText) formData.append('ocrText', ocrText);
      if (model) formData.append('model', model);

      setLoadingDetail(ocrText ? '正在AI分析文字...' : '正在AI分析图片...');
      const response = await fetch('/api/correct', {
        method: 'POST',
        body: formData,
        signal: cancelRef.current.signal,
      });
      const data = await response.json();

      if (cancelRef.current.signal.aborted) return;

      if (data.error) {
        setError(data.error);
      } else if (data.grading) {
        setGrading(data.grading);
        setBatchResults([]);
        setShowAnswer(false);
        setImageUrl(data.imageUrl || null);
        setLoadingDetail('完成啦');
      } else {
        setError('没有拿到结果，再试一次吧');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('已取消');
      } else {
        setError('好像出了点小问题，再试一次吧');
      }
    } finally {
      stopTimer(); setLoading(false); setLoadingDetail('');
    }
  };

  const handleBatchGrade = async (questions: string[]) => {
    setShowSelector(false);
    setLoading(true);
    setBatchResults([]);
    setGrading(null);
    setError('');
    setSaved(false);
    startTimer();

    try {
      cancelRef.current = new AbortController();
      setLoadingDetail('正在批量批改...');

      const savedModel = typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null;
      const response = await fetch('/api/correct/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, model: savedModel || undefined }),
        signal: cancelRef.current.signal,
      });
      const data = await response.json();

      if (cancelRef.current.signal.aborted) return;

      if (data.error) {
        setError(data.error);
      } else if (data.results) {
        setBatchResults(data.results);
        setLoadingDetail(`完成 ${data.results.length} 题批改`);
      } else {
        setError('没有拿到结果，再试一次吧');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('已取消');
      } else {
        setError('好像出了点小问题，再试一次吧');
      }
    } finally {
      stopTimer();
      setLoading(false);
      setLoadingDetail('');
    }
  };

  const handleSave = async () => {
    if (!grading) return;
    setSaved(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: grading.knowledge_point || '（图片题目）',
          errorAnalysis: grading.analysis,
          subject,
          imageUrl: imageUrl || '',
          grading,
        }),
      });
      const json = await res.json();
      if (json.data?.id) setSavedQuestionId(json.data.id);
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setError(''); setGrading(null); setSaved(false);
      setBatchResults([]); setShowSelector(false); setDetectedQuestions([]);
    }
  };

  if (status === 'loading') {
    return (
      <div style={styles.page}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#8e95a2' }}>加载中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', padding: '32px 20px', background: 'white', borderRadius: '16px', border: '1px solid #eef0f4' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px 0' }}>请先登录</h2>
          <p style={{ fontSize: '14px', color: '#8e95a2', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            使用前需要验证身份，防止 API 被滥用
          </p>
          <a href="/settings" style={{ display: 'inline-block', padding: '12px 32px', fontSize: '15px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '12px', cursor: 'pointer', textDecoration: 'none' }}>
            前往登录
          </a>
        </div>
      </div>
    );
  }

  if (showSelector) {
    return (
      <QuestionSelector
        questions={detectedQuestions}
        onConfirm={handleBatchGrade}
        onCancel={() => { setShowSelector(false); setDetectedQuestions([]); }}
        estimatedLabel={estimatedLabel}
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>作业小帮手</h1>
        <p style={styles.slogan}>每天进步一点点 🌱</p>
        <div style={styles.subjectRow}>
          {SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              style={{ ...styles.opt, ...(subject === s ? styles.optActive : {}) }}
            >{s}</button>
          ))}
        </div>
        <div style={{ marginTop: '10px' }}>
          <ModelSelector />
        </div>
      </div>

      {loading && (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <div style={styles.loadingText}>{loadingDetail} {elapsed}s</div>
          {loadingDetail.includes('检查') && (
            <div style={styles.loadingSub}>AI 正在确认图片是否清晰可读</div>
          )}
          {loadingDetail.includes('AI批改') && elapsed < 5 && (
            <div style={styles.loadingSub}>AI 正在仔细看你的题目...</div>
          )}
          {loadingDetail.includes('AI批改') && elapsed >= 5 && elapsed < 15 && (
            <div style={styles.loadingSub}>正在分析解题过程，请稍等~</div>
          )}
          {loadingDetail.includes('AI批改') && elapsed >= 15 && (
            <div style={styles.loadingSub}>这道题有点复杂，AI 还在思考中...</div>
          )}
          {slowWarning && (
            <div style={styles.slowWarning}>处理时间较长，AI 正在努力批改中...</div>
          )}
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={styles.uploadArea} onClick={() => !loading && fileRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="预览" style={styles.preview} />
          ) : (
            <div style={styles.uploadPlaceholder}>
              <div style={styles.uploadIcon}><IconCamera /></div>
              <div style={styles.uploadText}>点击拍照或选择图片</div>
            </div>
          )}
          <input ref={fileRef} type="file" name="image" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>

        {!loading && (
          <button
            type="submit"
            disabled={!preview}
            style={{ ...styles.btn, ...(!preview ? styles.btnDisabled : {}) }}
          >帮我看看</button>
        )}

        {loading && (
          <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
            取消
          </button>
        )}
      </form>

      {grading && (
        <div style={styles.result}>
          <div style={grading.is_correct ? styles.verdictOk : styles.verdictBad}>
            {grading.is_correct ? <><IconCheck /> 全对，真棒</> : <><IconX /> 一起看看怎么改进</>}
          </div>
          {!grading.is_correct && grading.error_type && <Tag label="订正类型" value={grading.error_type} />}
          {grading.knowledge_point && <Tag label="知识点" value={grading.knowledge_point} />}
          {!grading.is_correct && grading.guidance && (
            <Section title="想一想" content={grading.guidance} />
          )}
          {!showAnswer && !grading.is_correct && grading.guidance && (
            <button
              onClick={() => setShowAnswer(true)}
              style={styles.hintBtn}
            >
              还是不太懂，给我看看答案 →
            </button>
          )}
          {(showAnswer || !grading.guidance) && (
            <>
              {!grading.is_correct && grading.error_spot && <Section title="你的订正" content={grading.error_spot} md />}
              {grading.correct_solution && <Section title="正确答案" content={grading.correct_solution} md />}
              {grading.analysis && <Section title="为什么错了" content={grading.analysis} md />}
            </>
          )}
          {showAnswer && !grading.is_correct && (
            <button
              onClick={() => setShowAnswer(false)}
              style={styles.collapseBtn}
            >
              收起答案，我再想想 ↑
            </button>
          )}
          {grading.knowledge_tags.length > 0 && (
            <div style={styles.tags}>{grading.knowledge_tags.map((t, i) => <span key={i} style={styles.tag}>{t}</span>)}</div>
          )}
          <button
            onClick={handleSave}
            disabled={saved}
            style={{ ...styles.btn, ...(saved ? styles.btnSaved : {}), marginTop: '12px' }}
          >{saved ? '已记下来 📖' : '记下来 📖'}</button>
          {saved && grading && !grading.is_correct && grading.knowledge_point && (
            <div style={styles.nextActions}>
              <a href={`/quiz?kp=${encodeURIComponent(grading.knowledge_point)}`} style={styles.nextActionBtn}>
                📝 做同类题巩固一下
              </a>
              {savedQuestionId && (
                <a href={`/redo/${savedQuestionId}`} style={{ ...styles.nextActionBtn, background: '#27ae60' }}>
                  🔄 重新做这道题
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {batchResults.length > 0 && (
        <div style={styles.batchResult}>
          <div style={styles.batchHeader}>
            <span style={styles.batchTitle}>📋 批量批改结果</span>
            <span style={styles.batchCount}>{batchResults.length} 题</span>
          </div>
          {batchResults.map((r, i) => (
            <div key={i} style={styles.batchItem}>
              <div style={styles.batchItemHeader}>
                <span style={styles.batchItemNum}>第 {i + 1} 题</span>
                <span style={r.is_correct ? styles.verdictOk : styles.verdictBad}>
                  {r.is_correct ? '✅ 正确' : '❌ 需订正'}
                </span>
              </div>
              {r.error_type && <div style={styles.batchTag}>❌ {r.error_type}</div>}
              {r.knowledge_point && <div style={styles.batchTag}>📚 {r.knowledge_point}</div>}
              {!r.is_correct && r.guidance && <div style={styles.batchContent}>{r.guidance}</div>}
              {!r.is_correct && r.correct_solution && (
                <details style={styles.batchDetails}>
                  <summary style={styles.batchSummary}>查看答案</summary>
                  <div style={styles.batchContent}>{r.correct_solution}</div>
                  {r.analysis && <div style={styles.batchContent}>💡 {r.analysis}</div>}
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <span style={styles.badge}>{value}</span>
    </div>
  );
}

function Section({ title, content, md }: { title: string; content: string; md?: boolean }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{title}</div>
      {md ? <MarkdownRenderer content={content} /> : <div style={styles.fieldVal}>{content}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px' },
  header: { marginBottom: '20px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px 0' },
  slogan: { fontSize: '13px', color: '#8e95a2', margin: '0 0 12px 0', lineHeight: '1.5' },
  subjectRow: { display: 'flex', gap: '8px' },
  opt: { padding: '6px 16px', fontSize: '13px', fontWeight: 500, color: '#666', background: '#f0f2f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  optActive: { color: 'white', background: '#4f6ef7' },
  uploadArea: { border: '2px dashed #dde0e8', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' },
  uploadPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  uploadIcon: { color: '#8e95a2', width: '40px', height: '40px' },
  uploadText: { fontSize: '14px', color: '#8e95a2', fontWeight: 500 },
  preview: { maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', objectFit: 'contain' },
  btn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  hintBtn: { width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, color: '#4f6ef7', background: '#eef1ff', border: '1px solid #d0d8ff', borderRadius: '12px', cursor: 'pointer', marginBottom: '12px' },
  collapseBtn: { width: '100%', padding: '10px', fontSize: '13px', fontWeight: 500, color: '#8e95a2', background: '#f8f9fc', border: '1px solid #eef0f4', borderRadius: '12px', cursor: 'pointer', marginTop: '8px' },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  btnSaved: { color: '#27ae60', background: '#eafaf1', cursor: 'default' },
  loadingBox: { textAlign: 'center', padding: '40px 20px', color: '#8e95a2' },
  spinner: { width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #eef0f4', borderTopColor: '#4f6ef7', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' },
  loadingText: { fontSize: '14px' },
  loadingSub: { fontSize: '12px', color: '#b0b8c8', marginTop: '6px' },
  slowWarning: { fontSize: '12px', color: '#e67e22', marginTop: '8px', padding: '8px 12px', background: '#fef9e7', borderRadius: '8px' },
  error: { padding: '12px 16px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '10px', color: '#d63031', fontSize: '13px', marginBottom: '12px' },
  result: { marginTop: '16px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  verdictOk: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: 600, color: '#27ae60', marginBottom: '12px' },
  verdictBad: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: 600, color: '#d63031', marginBottom: '12px' },
  field: { marginBottom: '12px' },
  fieldLabel: { fontSize: '12px', fontWeight: 600, color: '#8e95a2', marginBottom: '4px' },
  fieldVal: { fontSize: '14px', lineHeight: '1.6', color: '#333' },
  badge: { fontSize: '13px', fontWeight: 500, padding: '3px 10px', borderRadius: '6px', background: '#eef1ff', color: '#4f6ef7', display: 'inline-block' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  tag: { fontSize: '12px', fontWeight: 500, padding: '3px 8px', borderRadius: '6px', background: '#eef1ff', color: '#4f6ef7' },
  nextActions: { display: 'flex', gap: '8px', marginTop: '10px' },
  nextActionBtn: { flex: 1, display: 'block', padding: '10px 0', fontSize: '12px', fontWeight: 600, color: 'white', background: '#4f6ef7', textDecoration: 'none', borderRadius: '8px', textAlign: 'center' },
  cancelBtn: { width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, color: '#d63031', background: 'white', border: '1px solid #d63031', borderRadius: '12px', cursor: 'pointer', marginTop: '8px' },
  batchResult: { marginTop: '16px' },
  batchHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' },
  batchTitle: { fontSize: '16px', fontWeight: 700, color: '#1a1a2e' },
  batchCount: { fontSize: '13px', color: '#8e95a2', background: '#f0f2f5', padding: '2px 10px', borderRadius: '12px' },
  batchItem: { padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4', marginBottom: '10px' },
  batchItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  batchItemNum: { fontSize: '14px', fontWeight: 600, color: '#4f6ef7' },
  batchTag: { fontSize: '13px', color: '#555', marginBottom: '4px' },
  batchContent: { fontSize: '13px', color: '#333', lineHeight: '1.6', marginTop: '6px' },
  batchDetails: { marginTop: '8px' },
  batchSummary: { fontSize: '13px', color: '#4f6ef7', cursor: 'pointer', fontWeight: 500 },
};
