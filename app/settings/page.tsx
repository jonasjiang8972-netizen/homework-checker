'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Settings() {
  const { data: session, status } = useSession();
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<'none' | 'has' | 'saving'>('none');
  const [maskedKey, setMaskedKey] = useState('');
  const [message, setMessage] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('数学');
  const [defaultModel, setDefaultModel] = useState('claude-3-5-sonnet-latest');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchKeyStatus();
      fetchSettings();
    }
  }, [status]);

  const fetchKeyStatus = async () => {
    try {
      const res = await fetch('/api/user/key');
      const json = await res.json();
      if (json.configured) {
        setKeyStatus('has');
        setMaskedKey(json.maskedKey || '');
      }
    } catch {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      const json = await res.json();
      if (json.defaultSubject) setDefaultSubject(json.defaultSubject);
      if (json.defaultModel) setDefaultModel(json.defaultModel);
    } catch {}
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setKeyStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/user/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const json = await res.json();
      if (json.error) {
        setMessage(`❌ ${json.error}`);
      } else {
        setKeyStatus('has');
        setMaskedKey(json.maskedKey);
        setApiKey('');
        setMessage('✅ API Key 已加密保存');
      }
    } catch {
      setMessage('❌ 保存失败');
    }
    setKeyStatus('none');
  };

  const handleDeleteKey = async () => {
    if (!confirm('确定删除 API Key？')) return;
    try {
      await fetch('/api/user/key', { method: 'DELETE' });
      setKeyStatus('none');
      setMaskedKey('');
      setMessage('✅ API Key 已删除');
    } catch {
      setMessage('❌ 删除失败');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultSubject, defaultModel }),
      });
      const json = await res.json();
      setMessage(json.ok ? '✅ 偏好设置已保存' : '❌ 保存失败');
    } catch {
      setMessage('❌ 保存失败');
    }
  };

  if (status === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.card}><div style={styles.loading}>加载中...</div></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🔐</div>
            <p style={styles.emptyText}>请先登录以管理你的设置</p>
            <button onClick={() => signIn('google')} style={styles.primaryBtn}>🔗 Google 登录</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <a href="/" style={styles.backLink}>← 返回</a>
          <h1 style={styles.title}>👤 用户中心</h1>
          <button onClick={() => signOut()} style={styles.logoutBtn}>退出</button>
        </header>

        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {session?.user?.image
              ? <img src={session.user.image} alt="" style={styles.avatarImg} />
              : '👤'}
          </div>
          <div>
            <div style={styles.userName}>{session?.user?.name || '用户'}</div>
            <div style={styles.userEmail}>{session?.user?.email}</div>
          </div>
        </div>

        {message && <div style={styles.msg}>{message}</div>}

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🔑 Claude API Key</h2>
          <p style={styles.sectionDesc}>填写你自己的 API Key，会加密存储（AES-256-GCM），仅用于批改请求。</p>

          {keyStatus === 'has' && (
            <div style={styles.keyInfo}>
              <span>当前：{maskedKey}</span>
              <button onClick={handleDeleteKey} style={styles.dangerBtn}>删除</button>
            </div>
          )}

          <div style={styles.keyInputRow}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              style={styles.keyInput}
            />
            <button
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || keyStatus === 'saving'}
              style={{ ...styles.primaryBtn, ...(!apiKey.trim() ? styles.btnDisabled : {}) }}
            >
              保存
            </button>
          </div>
          <a href="https://console.anthropic.com" target="_blank" style={styles.extLink}>
            获取 Claude API Key →
          </a>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>⚙️ 偏好设置</h2>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>默认学科</label>
            <select value={defaultSubject} onChange={e => setDefaultSubject(e.target.value)} style={styles.select}>
              <option value="数学">数学</option>
              <option value="语文">语文</option>
              <option value="英语">英语</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>默认模型</label>
            <select value={defaultModel} onChange={e => setDefaultModel(e.target.value)} style={styles.select}>
              <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
              <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku</option>
              <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            </select>
          </div>

          <button onClick={handleSaveSettings} style={styles.primaryBtn}>保存偏好</button>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { maxWidth: '480px', margin: '0 auto', background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  backLink: { color: '#667eea', textDecoration: 'none', fontSize: '14px', width: '60px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  logoutBtn: { padding: '6px 14px', fontSize: '12px', color: '#888', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '40px', color: '#888' },
  empty: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon: { fontSize: '56px', marginBottom: '12px' },
  emptyText: { color: '#888', marginBottom: '16px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#f8f9fc', borderRadius: '14px', marginBottom: '20px' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef1ff' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  userName: { fontSize: '16px', fontWeight: 600, color: '#1a1a2e' },
  userEmail: { fontSize: '13px', color: '#888' },
  msg: { padding: '10px 14px', borderRadius: '10px', background: '#eafaf1', color: '#27ae60', fontSize: '13px', marginBottom: '14px' },
  section: { marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #eee' },
  sectionTitle: { fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' },
  sectionDesc: { fontSize: '13px', color: '#888', margin: '0 0 14px 0', lineHeight: '1.5' },
  keyInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#eef1ff', borderRadius: '10px', fontSize: '13px', color: '#667eea', fontWeight: 500, marginBottom: '12px' },
  dangerBtn: { padding: '4px 10px', fontSize: '12px', color: '#d63031', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '6px', cursor: 'pointer' },
  keyInputRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  keyInput: { flex: 1, padding: '10px 12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '10px', outline: 'none', fontFamily: 'monospace' },
  primaryBtn: { padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  extLink: { display: 'inline-block', fontSize: '12px', color: '#667eea', textDecoration: 'none' },
  settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  settingLabel: { fontSize: '14px', fontWeight: 500, color: '#555' },
  select: { padding: '8px 12px', fontSize: '13px', border: '1px solid #e0e4ee', borderRadius: '8px', outline: 'none', color: '#333', background: 'white' },
};
