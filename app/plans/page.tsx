'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { IconBook, IconTarget, IconCheck, IconPlus, IconFileText } from '../../lib/icons';

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
  pending: { label: '还没开始', color: '#8e95a2', bg: '#f0f2f5' },
  studying: { label: '正在努力', color: '#4f6ef7', bg: '#eef1ff' },
  done: { label: '完成啦 ✅', color: '#27ae60', bg: '#eafaf1' },
  overdue: { label: '超时了 ⏰', color: '#d63031', bg: '#fff5f5' },
};

export default function Plans() {
  const { data: session, status } = useSession();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 16px', textAlign: 'center', color: '#8e95a2' }}>
        加载中...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', padding: '32px 20px', background: 'white', borderRadius: '16px', border: '1px solid #eef0f4' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px 0' }}>请先登录</h2>
        <p style={{ fontSize: '14px', color: '#8e95a2', margin: '0 0 20px 0' }}>
          查看学习路线需要先验证身份
        </p>
        <a href="/settings" style={{ display: 'inline-block', padding: '12px 32px', fontSize: '15px', fontWeight: 600, color: 'white', background: '#4f6ef7', borderRadius: '12px', textDecoration: 'none' }}>
          前往登录
        </a>
      </div>
    );
  }

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
      setError('加载失败了，检查一下网络吧');
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
      setError('好像出了点小问题，再试一次吧');
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
    return `${d.getMonth() + 1}月${d.getDate()}日`;
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
      <div style={styles.header}>
        <h1 style={styles.title}>我的学习路线</h1>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{ ...styles.generateBtn, ...(generating ? styles.generateDisabled : {}) }}
      >
        {generating ? (
          <span style={styles.loadingRow}>
            <span style={styles.spinner} />
            正在为你定制学习路线...
          </span>
        ) : (
          <span style={styles.loadingRow}>
            <IconPlus /> 定制路线
          </span>
        )}
      </button>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={styles.skeletonList}>
          {[0, 1, 2].map(i => <div key={i} style={styles.skeletonItem} />)}
        </div>
      ) : !error && plans.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><IconBook /></div>
          <p style={styles.emptyText}>还没有学习路线</p>
          <p style={styles.emptyHint}>多做几道题，我会帮你发现需要练习的知识点~</p>
        </div>
      ) : (
        <div style={styles.list}>
          {plans.map(p => (
            <div key={p.id} style={styles.planCard}>
              <div style={styles.planHeader}>
                <div style={styles.planTitleRow}>
                  <div style={styles.planTitle}>{p.title}</div>
                  <div style={styles.planKp}>{p.target_knowledge_point}</div>
                </div>
                <span style={{
                  ...styles.statusTag,
                  background: (STATUS_MAP[p.status] || STATUS_MAP.pending).bg,
                  color: (STATUS_MAP[p.status] || STATUS_MAP.pending).color,
                }}>{(STATUS_MAP[p.status] || STATUS_MAP.pending).label}</span>
              </div>

              {p.steps && p.steps.length > 0 && (
                <div style={styles.stepsSection}>
                   <div style={styles.stepsTitle}>步骤</div>
                  {p.steps.map((step, i) => (
                    <div key={i} style={styles.stepItem}>
                      <div style={{
                        ...styles.stepCheck,
                        background: p.status === 'done' ? '#27ae60' : '#eef0f4',
                        color: p.status === 'done' ? 'white' : '#8e95a2',
                      }}>
                        {p.status === 'done' ? <IconCheck /> : i + 1}
                      </div>
                      <span style={styles.stepText}>{step}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                   <span style={styles.progressLabel}>目标</span>
                  <span style={styles.progressValue}>{p.current_mastery}% → {p.target_mastery}%</span>
                </div>
                <div style={styles.barBg}>
                  <div style={{
                    ...styles.barFill,
                    width: `${progressPct(p)}%`,
                    background: progressPct(p) >= 100 ? '#27ae60' : '#4f6ef7',
                  }} />
                </div>
              </div>

              <div style={styles.planActions}>
                {p.status === 'pending' && (
                  <button onClick={() => handleStatusChange(p.id, 'studying')} style={styles.actionBtn}>
                    开始吧
                  </button>
                )}
                {p.status === 'studying' && (
                  <button onClick={() => handleStatusChange(p.id, 'done')} style={{ ...styles.actionBtn, background: '#27ae60' }}>
                    我学会啦
                  </button>
                )}
                {p.status === 'done' && (
                  <div style={styles.doneLabel}><IconCheck /> 这个知识点学会啦！</div>
                )}
              </div>

              <div style={styles.planFooter}>
                  <span style={styles.planDate}>{formatDate(p.created_at)} 制定</span>
                {p.due_date && <span style={styles.planDue}>截止: {p.due_date}</span>}
              </div>
            </div>
          ))}
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
  header: { marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  generateBtn: { width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  generateDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  loadingRow: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
  spinner: { width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  errorBox: { marginBottom: '14px', padding: '12px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '10px', color: '#d63031', fontSize: '13px' },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  skeletonItem: { height: '160px', borderRadius: '12px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },
  emptyState: { textAlign: 'center', padding: '48px 20px' },
  emptyIcon: { width: '48px', height: '48px', margin: '0 auto 12px', color: '#c0c4cc' },
  emptyText: { color: '#8e95a2', marginBottom: '8px', fontSize: '15px' },
  emptyHint: { color: '#aaa', fontSize: '13px', lineHeight: '1.5' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  planCard: { padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  planHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  planTitleRow: { flex: 1, minWidth: 0 },
  planTitle: { fontSize: '15px', fontWeight: 600, color: '#1a1a2e', marginBottom: '3px' },
  planKp: { fontSize: '12px', color: '#4f6ef7', fontWeight: 500 },
  statusTag: { fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', flexShrink: 0, marginLeft: '8px' },
  stepsSection: { marginBottom: '14px' },
  stepsTitle: { fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px' },
  stepItem: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' },
  stepCheck: { width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px', fontSize: '10px', fontWeight: 700 },
  stepText: { fontSize: '13px', color: '#444', lineHeight: '1.5' },
  progressSection: { marginBottom: '12px' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  progressLabel: { fontSize: '11px', color: '#8e95a2' },
  progressValue: { fontSize: '11px', fontWeight: 600, color: '#4f6ef7' },
  barBg: { height: '6px', background: '#eef0f4', borderRadius: '3px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s' },
  planActions: { marginBottom: '10px' },
  actionBtn: { padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  doneLabel: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#27ae60', fontWeight: 500, padding: '8px 0' },
  planFooter: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa' },
  planDate: {},
  planDue: { color: '#d63031' },
};
