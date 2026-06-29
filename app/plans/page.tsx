'use client';

import { useEffect, useState } from 'react';

interface StudyPlan {
  id: string;
  title: string;
  target_knowledge_point: string;
  current_mastery: number;
  target_mastery: number;
  status: string;
  steps: string[];
  created_at: string;
  due_date: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待开始', color: '#888', bg: '#f0f0f0' },
  studying: { label: '学习中', color: '#667eea', bg: '#eef1ff' },
  done: { label: '已完成', color: '#27ae60', bg: '#eafaf1' },
  overdue: { label: '已过期', color: '#d63031', bg: '#fff5f5' },
};

export default function Plans() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/plans');
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        setPlans([]);
      } else {
        setPlans(json.plans || []);
      }
    } catch {
      setError('加载失败');
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/plans', { method: 'POST' });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else if (json.plans) {
        setPlans(prev => [...(json.plans || []), ...prev]);
      }
    } catch {
      setError('网络错误，请重试');
    }
    setGenerating(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.ok) {
        setPlans(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      }
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const progressPct = (plan: StudyPlan) => {
    if (plan.status === 'done') return 100;
    if (plan.status === 'pending') return 0;
    const current = Math.max(0, Math.min(100, plan.current_mastery));
    const target = plan.target_mastery;
    if (target <= current) return 100;
    return Math.round(((current - 30) / (target - 30)) * 100);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <a href="/" style={styles.backLink}>← 返回</a>
          <h1 style={styles.title}>📋 学习计划</h1>
          <div style={{ width: '60px' }} />
        </header>

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ ...styles.generateBtn, ...(generating ? styles.generateDisabled : {}) }}
        >
          {generating ? (
            <span style={styles.loadingRow}>
              <span style={styles.spinner} />
              AI 正在生成计划...
            </span>
          ) : '✨ AI 生成学习计划'}
        </button>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {loading ? (
          <div style={styles.skeletonList}>
            {[0, 1, 2].map(i => <div key={i} style={styles.skeletonItem} />)}
          </div>
        ) : !error && plans.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <p style={styles.emptyText}>暂无学习计划</p>
            <p style={styles.emptyHint}>批改错题后，AI 会分析薄弱知识点并生成针对性提升计划</p>
          </div>
        ) : (
          <div style={styles.list}>
            {plans.map(p => (
              <div key={p.id} style={styles.planCard}>
                <div style={styles.planHeader}>
                  <div>
                    <div style={styles.planTitle}>{p.title}</div>
                    <div style={styles.planKp}>🎯 {p.target_knowledge_point}</div>
                  </div>
                  <span style={{
                    ...styles.statusTag,
                    background: (STATUS_MAP[p.status] || STATUS_MAP.pending).bg,
                    color: (STATUS_MAP[p.status] || STATUS_MAP.pending).color,
                  }}>{(STATUS_MAP[p.status] || STATUS_MAP.pending).label}</span>
                </div>

                {p.steps && p.steps.length > 0 && (
                  <div style={styles.stepsSection}>
                    <div style={styles.stepsTitle}>📝 学习步骤</div>
                    {p.steps.map((step, i) => (
                      <div key={i} style={styles.stepItem}>
                        <span style={styles.stepNum}>{i + 1}</span>
                        <span style={styles.stepText}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.progressSection}>
                  <div style={styles.progressHeader}>
                    <span style={styles.progressLabel}>掌握度目标</span>
                    <span style={styles.progressValue}>{p.current_mastery} → {p.target_mastery}</span>
                  </div>
                  <div style={styles.barBg}>
                    <div style={{
                      ...styles.barFill,
                      width: `${progressPct(p)}%`,
                      background: progressPct(p) >= 100 ? '#27ae60' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    }} />
                  </div>
                </div>

                <div style={styles.planActions}>
                  {p.status === 'pending' && (
                    <button onClick={() => handleStatusChange(p.id, 'studying')} style={styles.actionBtn}>
                      ▶️ 开始学习
                    </button>
                  )}
                  {p.status === 'studying' && (
                    <button onClick={() => handleStatusChange(p.id, 'done')} style={{ ...styles.actionBtn, ...styles.doneBtn }}>
                      ✅ 标记完成
                    </button>
                  )}
                  {p.status === 'done' && (
                    <div style={styles.doneLabel}>🎉 太棒了，这个知识点已掌握！</div>
                  )}
                </div>

                <div style={styles.planFooter}>
                  <span style={styles.planDate}>{formatDate(p.created_at)}</span>
                  {p.due_date && <span style={styles.planDue}>截止: {p.due_date}</span>}
                </div>
              </div>
            ))}
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
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  backLink: { color: '#667eea', textDecoration: 'none', fontSize: '14px', width: '60px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  generateBtn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '16px' },
  generateDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  loadingRow: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
  spinner: { width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  errorBox: { marginBottom: '16px', padding: '14px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '12px', color: '#d63031', fontSize: '14px' },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' },
  skeletonItem: { height: '160px', borderRadius: '14px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },
  emptyState: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon: { fontSize: '56px', marginBottom: '12px' },
  emptyText: { color: '#888', marginBottom: '8px', fontSize: '15px' },
  emptyHint: { color: '#aaa', fontSize: '13px', lineHeight: '1.5' },
  list: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' },
  planCard: { padding: '18px', background: '#f8f9fc', borderRadius: '16px', border: '1px solid #eee' },
  planHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  planTitle: { fontSize: '16px', fontWeight: 600, color: '#1a1a2e', marginBottom: '4px' },
  planKp: { fontSize: '13px', color: '#667eea', fontWeight: 500 },
  statusTag: { fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', flexShrink: 0 },
  stepsSection: { marginBottom: '14px' },
  stepsTitle: { fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '8px' },
  stepItem: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' },
  stepNum: { width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' },
  stepText: { fontSize: '13px', color: '#444', lineHeight: '1.5' },
  progressSection: { marginBottom: '14px' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  progressLabel: { fontSize: '12px', color: '#888' },
  progressValue: { fontSize: '12px', fontWeight: 600, color: '#667eea' },
  barBg: { height: '8px', background: '#e0e4ee', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  planActions: { marginBottom: '10px' },
  actionBtn: { padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  doneBtn: { background: '#27ae60' },
  doneLabel: { fontSize: '13px', color: '#27ae60', fontWeight: 500, padding: '8px 0' },
  planFooter: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#aaa' },
  planDate: {},
  planDue: { color: '#d63031' },
};