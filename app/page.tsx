'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { GradingResult } from '../lib/grading';
import { MarkdownRenderer } from '../lib/markdown-renderer';
import { IconCamera, IconCheck, IconX } from '../lib/icons';

const SUBJECTS = ['数学', '语文', '英语', '其他'];

export default function Home() {
  const { data: session } = useSession();
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState('数学');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size < 1.5 * 1024 * 1024) { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1600;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => { URL.revokeObjectURL(url); resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file); },
          'image/jpeg', 0.85
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
  };
  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = fileRef.current;
    const rawFile = fileInput?.files?.[0];
    if (!rawFile) return;

    setLoading(true); setGrading(null); setError(''); setSaved(false);
    startTimer();
    setLoadingDetail('正在准备图片...');

    try {
      const compressed = await compressImage(rawFile);
      setLoadingDetail('正在准备图片...');

      const formData = new FormData();
      formData.append('image', compressed);
      const savedModel = typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null;
      if (savedModel) formData.append('model', savedModel);

      const response = await fetch('/api/correct', { method: 'POST', body: formData });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.grading) {
        setGrading(data.grading);
        setImageUrl(data.imageUrl || null);
        setLoadingDetail('完成啦');
      } else {
        setError('没有拿到结果，再试一次吧');
      }
    } catch {
      setError('好像出了点小问题，再试一次吧');
    } finally {
      stopTimer(); setLoading(false); setLoadingDetail('');
    }
  };

  const handleSave = async () => {
    if (!grading) return;
    setSaved(true);
    try {
      await fetch('/api/questions', {
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
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setError(''); setGrading(null); setSaved(false);
    }
  };

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
      </div>

      {loading && (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <div style={styles.loadingText}>{loadingDetail} {elapsed}s</div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

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
          onClick={() => fileRef.current?.form?.requestSubmit()}
          disabled={!preview}
          style={{ ...styles.btn, ...(!preview ? styles.btnDisabled : {}) }}
        >帮我看看</button>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'none' }} />

      {grading && (
        <div style={styles.result}>
          <div style={grading.is_correct ? styles.verdictOk : styles.verdictBad}>
            {grading.is_correct ? <><IconCheck /> 全对，真棒</> : <><IconX /> 一起看看怎么改进</>}
          </div>
          {!grading.is_correct && grading.error_type && <Tag label="订正类型" value={grading.error_type} />}
          {grading.knowledge_point && <Tag label="知识点" value={grading.knowledge_point} />}
          {!grading.is_correct && grading.error_spot && <Section title="你的订正" content={grading.error_spot} md />}
          {grading.correct_solution && <Section title="正确答案" content={grading.correct_solution} md />}
          {grading.analysis && <Section title="为什么错了" content={grading.analysis} md />}
          {grading.knowledge_tags.length > 0 && (
            <div style={styles.tags}>{grading.knowledge_tags.map((t, i) => <span key={i} style={styles.tag}>{t}</span>)}</div>
          )}
          <button
            onClick={handleSave}
            disabled={saved}
            style={{ ...styles.btn, ...(saved ? styles.btnSaved : {}), marginTop: '12px' }}
          >{saved ? '已记下来 📖' : '记下来 📖'}</button>
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
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  btnSaved: { color: '#27ae60', background: '#eafaf1', cursor: 'default' },
  loadingBox: { textAlign: 'center', padding: '40px', color: '#8e95a2' },
  spinner: { width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #eef0f4', borderTopColor: '#4f6ef7', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' },
  loadingText: { fontSize: '14px' },
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
};
