'use client';

import { useEffect, useState } from 'react';

interface KnowledgePointStat {
  name: string;
  masteryLevel: number;
  totalCount: number;
  correctCount: number;
  weak: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<KnowledgePointStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        setStats([]);
      } else {
        setStats(json.stats || []);
      }
    } catch {
      setError('加载失败');
    }
    setLoading(false);
  };

  const masteryColor = (level: number) => {
    if (level < 25) return '#d63031';
    if (level < 40) return '#e17055';
    if (level < 60) return '#fdcb6e';
    if (level < 80) return '#00b894';
    return '#27ae60';
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <a href="/" style={styles.backLink}>← 返回</a>
          <h1 style={styles.title}>📊 掌握度看板</h1>
          <div style={{ width: '60px' }} />
        </header>

        {loading ? (
          <div style={styles.skeletonList}>
            {[0, 1, 2].map(i => <div key={i} style={styles.skeletonItem} />)}
          </div>
        ) : error ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⚠️</div>
            <p style={styles.emptyText}>{error}</p>
            <button onClick={fetchStats} style={styles.retryBtn}>重试</button>
          </div>
        ) : stats.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📊</div>
            <p style={styles.emptyText}>暂无数据，先去批改几道题吧</p>
            <a href="/" style={styles.emptyBtn}>去批改</a>
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
                <div style={styles.summaryLabel}>薄弱点</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={{ ...styles.summaryNum, color: '#27ae60' }}>{stats.filter(s => s.masteryLevel >= 80).length}</div>
                <div style={styles.summaryLabel}>已掌握</div>
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
                    <span>正确 {s.correctCount}/{s.totalCount} 题</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {s.weak && <span style={styles.weakTag}>薄弱</span>}
                      <a href={`/quiz?kp=${encodeURIComponent(s.name)}`} style={styles.quizLink}>测验→</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { maxWidth: '480px', margin: '0 auto', background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  backLink: { color: '#667eea', textDecoration: 'none', fontSize: '14px', width: '60px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  skeletonList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  skeletonItem: { height: '72px', borderRadius: '14px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' },
  emptyState: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon: { fontSize: '56px', marginBottom: '12px' },
  emptyText: { color: '#888', marginBottom: '16px' },
  emptyBtn: { display: 'inline-block', padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500 },
  retryBtn: { padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' },
  summary: { display: 'flex', gap: '10px', marginBottom: '20px' },
  summaryItem: { flex: 1, textAlign: 'center', padding: '12px', background: '#f8f9fc', borderRadius: '14px' },
  summaryNum: { fontSize: '24px', fontWeight: 700, color: '#1a1a2e' },
  summaryLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  item: { padding: '14px', background: '#f8f9fc', borderRadius: '14px', border: '1px solid #eee' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  itemName: { fontSize: '14px', fontWeight: 600, color: '#333' },
  itemScore: { fontSize: '18px', fontWeight: 700 },
  barBg: { height: '8px', background: '#e0e4ee', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  itemFooter: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' },
  weakTag: { fontSize: '11px', fontWeight: 600, color: '#d63031', background: '#fff5f5', padding: '2px 8px', borderRadius: '6px' },
  quizLink: { fontSize: '11px', fontWeight: 500, color: '#667eea', textDecoration: 'none', padding: '2px 6px' },
};