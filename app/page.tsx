'use client';

import { useState, useRef } from 'react';
import type { GradingResult } from '../lib/grading';

export default function Home() {
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
          },
          'image/jpeg',
          0.85
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
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.image as HTMLInputElement;
    const rawFile = fileInput.files?.[0];
    if (!rawFile) return;

    setLoading(true);
    setGrading(null);
    setError('');
    setSaved(false);
    startTimer();

    try {
      const compressed = await compressImage(rawFile);
      const formData = new FormData();
      formData.append('image', compressed);

      const response = await fetch('/api/correct', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else if (data.grading) {
        setGrading(data.grading);
      } else {
        setError('未返回批改结果');
      }
    } catch {
      setError('网络错误，请重试');
    }
    stopTimer();
    setLoading(false);
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
          subject: '数学',
          imageUrl: '',
          grading,
        }),
      });
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setError('');
      setGrading(null);
      setSaved(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.logo}>📚</div>
          <h1 style={styles.title}>错题批改助手</h1>
          <p style={styles.subtitle}>拍照上传题目，AI 立即批改并分析错因</p>
        </header>

        <nav style={styles.nav}>
          <a href="/history" style={styles.navLink}>📋 错题本</a>
          <a href="/dashboard" style={styles.navLink}>📊 掌握度</a>
          <a href="/api/auth/signin" style={styles.navLink}>🔗 登录</a>
        </nav>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.uploadArea}>
            {preview ? (
              <img src={preview} alt="题目预览" style={styles.preview} />
            ) : (
              <div style={styles.uploadPlaceholder}>
                <div style={styles.uploadIcon}>📷</div>
                <div style={styles.uploadText}>点击选择题目图片</div>
                <div style={styles.uploadHint}>支持拍照或从相册选择</div>
              </div>
            )}
            <input
              type="file"
              name="image"
              accept="image/*"
              capture="environment"
              required
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          <button
            type="submit"
            disabled={loading || !preview}
            style={{ ...styles.submitBtn, ...(loading || !preview ? styles.submitDisabled : {}) }}
          >
            {loading ? (
              <span style={styles.loadingRow}>
                <span style={styles.spinner} />
                批改中... {elapsed}s
              </span>
            ) : '✨ 开始批改'}
          </button>
        </form>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {grading && (
          <div style={styles.resultBox}>
            <div style={grading.is_correct ? styles.verdictOk : styles.verdictBad}>
              {grading.is_correct ? '✅ 全部正确' : '❌ 存在错误'}
            </div>

            {!grading.is_correct && grading.error_type && (
              <Field label="错误类型" value={grading.error_type} tag />
            )}
            {grading.knowledge_point && (
              <Field label="知识点" value={grading.knowledge_point} tag />
            )}
            {grading.error_spot && !grading.is_correct && (
              <Field label="🔍 错误之处" value={grading.error_spot} />
            )}
            {grading.correct_solution && (
              <Field label="✏️ 正确解答" value={grading.correct_solution} pre />
            )}
            {grading.analysis && (
              <Field label="💡 错因分析" value={grading.analysis} />
            )}
            {grading.knowledge_tags.length > 0 && (
              <div style={styles.field}>
                <div style={styles.fieldLabel}>🏷️ 标签</div>
                <div style={styles.tags}>
                  {grading.knowledge_tags.map((t, i) => (
                    <span key={i} style={styles.tag}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saved}
              style={{ ...styles.saveBtn, ...(saved ? styles.savedBtn : {}) }}
            >
              {saved ? '✓ 已存入错题本' : '💾 存入错题本'}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Field({ label, value, tag, pre }: { label: string; value: string; tag?: boolean; pre?: boolean }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      {tag ? (
        <span style={styles.tag}>{value}</span>
      ) : (
        <div style={pre ? styles.fieldPre : styles.fieldText}>{value}</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: '480px', background: 'white', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  header: { textAlign: 'center', marginBottom: '20px' },
  logo: { fontSize: '56px', marginBottom: '8px' },
  title: { fontSize: '26px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' },
  subtitle: { fontSize: '14px', color: '#888', margin: 0 },
  nav: { display: 'flex', gap: '8px', marginBottom: '20px' },
  navLink: { flex: 1, display: 'block', padding: '10px 6px', textAlign: 'center', fontSize: '13px', color: '#667eea', background: '#f0f3ff', textDecoration: 'none', borderRadius: '10px', fontWeight: 500 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  uploadArea: { border: '2px dashed #d0d5e0', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: '#fafbfc' },
  uploadPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  uploadIcon: { fontSize: '44px', marginBottom: '8px' },
  uploadText: { fontSize: '15px', color: '#666', fontWeight: 500 },
  uploadHint: { fontSize: '12px', color: '#aaa', marginTop: '4px' },
  preview: { maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', objectFit: 'contain' },
  submitBtn: { padding: '16px', fontSize: '17px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '14px', cursor: 'pointer' },
  submitDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  loadingRow: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
  spinner: { width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  errorBox: { marginTop: '16px', padding: '14px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '12px', color: '#d63031', fontSize: '14px' },
  resultBox: { marginTop: '20px', padding: '20px', background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf5 100%)', borderRadius: '16px', maxHeight: '420px', overflow: 'auto' },
  verdictOk: { fontSize: '18px', fontWeight: 700, color: '#27ae60', marginBottom: '14px', padding: '10px', background: '#eafaf1', borderRadius: '10px', textAlign: 'center' },
  verdictBad: { fontSize: '18px', fontWeight: 700, color: '#d63031', marginBottom: '14px', padding: '10px', background: '#fff5f5', borderRadius: '10px', textAlign: 'center' },
  field: { marginBottom: '14px' },
  fieldLabel: { fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '4px' },
  fieldText: { fontSize: '14px', lineHeight: '1.6', color: '#333' },
  fieldPre: { fontSize: '13px', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'white', padding: '10px', borderRadius: '8px' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  tag: { fontSize: '12px', padding: '3px 10px', borderRadius: '8px', background: '#eef1ff', color: '#667eea', fontWeight: 500 },
  saveBtn: { marginTop: '6px', width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, color: '#667eea', background: 'white', border: '1px solid #667eea', borderRadius: '10px', cursor: 'pointer' },
  savedBtn: { color: '#27ae60', borderColor: '#27ae60', cursor: 'default' },
};