'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { IconChart, IconTarget, IconStar, IconFileText } from '../../lib/icons';

interface KnowledgePointStat {
  name: string;
  masteryLevel: number;
  totalCount: number;
  correctCount: number;
  weak: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<KnowledgePointStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('全部');
  const [subjects, setSubjects] = useState<string[]>(['全部']);

  useEffect(() => {
    fetchStats();
    fetchSubjects();
  }, []);

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
          查看学习地图需要先验证身份
        </p>
        <a href="/settings" style={{ display: 'inline-block', padding: '12px 32px', fontSize: '15px', fontWeight: 600, color: 'white', background: '#4f6ef7', borderRadius: '12px', textDecoration: 'none' }}>
          前往登录
        </a>
      </div>
    );
  }

  const fetchStats = async (sub?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (sub && sub !== '全部') params.set('subject', sub);
      const res = await fetch(`/api/stats?${params}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        setStats([]);
      } else {
        setStats(json.stats || []);
      }
    } catch {
      setError('加载失败了，检查一下网络吧');
    }
    setLoading(false);
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/questions?sort_by=subject');
      const json = await res.json();
      if (json.data) {
        const set = new Set<string>();
        (json.data as any[]).forEach((q: any) => { if (q.subject && q.subject !== '未分类') set.add(q.subject); });
        setSubjects(['全部', ...Array.from(set)]);
      }
    } catch {}
  };

  const handleSubjectChange = (sub: string) => {
    setSubject(sub);
    fetchStats(sub);
  };

  const masteryColor = (level: number) => {
    if (level < 25) return '#d63031';
    if (level < 40) return '#e17055';
    if (level < 60) return '#fdcb6e';
    if (level < 80) return '#00b894';
    return '#27ae60';
  };

const masteryLabel = (level: number) => {
    if (level < 25) return '多练练';
    if (level < 40) return '多练练';
    if (level < 60) return '有进步 💪';
    if (level < 80) return '已经很棒啦 🌟';
    return '太棒啦 🎉';
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>我的学习地图 🗺️</h1>
      </div>

      {subjects.length > 1 && (
        <div style={styles.subjectBar}>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => handleSubjectChange(s)}
              style={{
                ...styles.subjectBtn,
                ...(subject === s ? styles.subjectBtnActive : {}),
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={styles.skeletonList}>
          {[0, 1, 2].map(i => <div key={i} style={styles.skeletonItem} />)}
        </div>
      ) : error ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><IconFileText /></div>
          <p style={styles.emptyText}>{error}</p>
          <button onClick={() => fetchStats()} style={styles.primaryBtn}>重试</button>
        </div>
      ) : stats.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}><IconChart /></div>
          <p style={styles.emptyText}>还没有学习记录，开始第一次挑战吧</p>
          <a href="/" style={styles.primaryBtn}>开始挑战</a>
        </div>
      ) : (
        <div>
          <div style={styles.summary}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryNum}>{stats.length}</div>
              <div style={styles.summaryLabel}>知识点</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryNum, color: '#d63031' }}>{stats.filter(s => s.weak).length}</div>
              <div style={styles.summaryLabel}>多练习</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={{ ...styles.summaryNum, color: '#27ae60' }}>{stats.filter(s => s.masteryLevel >= 80).length}</div>
              <div style={styles.summaryLabel}>已经掌握啦 🎯</div>
            </div>
          </div>

          <div style={styles.list}>
            {stats.map(s => (
              <div key={s.name} style={styles.item}>
                <div style={styles.itemHeader}>
                  <span style={styles.itemName}>{s.name}</span>
                  <span style={{ ...styles.itemScore, color: masteryColor(s.masteryLevel) }}>
                    {s.masteryLevel}
                  </span>
                </div>
                <div style={styles.barBg}>
                  <div style={{
                    ...styles.barFill,
                    width: `${s.masteryLevel}%`,
                    background: masteryColor(s.masteryLevel),
                  }} />
                </div>
                <div style={styles.itemFooter}>
                  <span style={styles.itemMeta}>答对 {s.correctCount}/{s.totalCount} 题 · {masteryLabel(s.masteryLevel)}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {s.weak && <span style={styles.weakTag}>多练练</span>}
                    <a href={`/quiz?kp=${encodeURIComponent(s.name)}`} style={styles.quizLink}>测验</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px', background: '#f8f9fc', minHeight: '100vh' },
  header: { marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  subjectBar: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' },
  subjectBtn: { padding: '5px 14px', fontSize: '12px', fontWeight: 500, color: '#666', background: '#f0f2f5', border: 'none', borderRadius: '20px', cursor: 'pointer' },
  subjectBtnActive: { color: 'white', background: '#4f6ef7' },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  skeletonItem: { height: '72px', borderRadius: '12px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },
  emptyState: { textAlign: 'center', padding: '48px 20px' },
  emptyIcon: { width: '48px', height: '48px', margin: '0 auto 12px', color: '#c0c4cc' },
  emptyText: { color: '#8e95a2', marginBottom: '16px', fontSize: '14px' },
  primaryBtn: { display: 'inline-block', padding: '10px 24px', background: '#4f6ef7', color: 'white', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' },
  summary: { display: 'flex', gap: '10px', marginBottom: '20px' },
  summaryItem: { flex: 1, textAlign: 'center', padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  summaryNum: { fontSize: '24px', fontWeight: 700, color: '#1a1a2e' },
  summaryLabel: { fontSize: '11px', color: '#8e95a2', marginTop: '4px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  item: { padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  itemName: { fontSize: '14px', fontWeight: 600, color: '#333' },
  itemScore: { fontSize: '18px', fontWeight: 700 },
  barBg: { height: '8px', background: '#eef0f4', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  itemFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' },
  itemMeta: { color: '#8e95a2' },
  weakTag: { fontSize: '10px', fontWeight: 600, color: '#d63031', background: '#fff5f5', padding: '2px 8px', borderRadius: '6px' },
  quizLink: { fontSize: '11px', fontWeight: 500, color: '#4f6ef7', textDecoration: 'none', padding: '2px 6px' },
};
