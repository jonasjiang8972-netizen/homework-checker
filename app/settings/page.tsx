'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { IconSettings, IconLogout } from '../../lib/icons';

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
        setMessage(json.error);
      } else {
        setKeyStatus('has');
        setMaskedKey(json.maskedKey);
        setApiKey('');
        setMessage('API Key 已加密保存');
      }
    } catch {
      setMessage('保存失败');
    }
    setKeyStatus('none');
  };

  const handleDeleteKey = async () => {
    if (!confirm('确定删除 API Key？')) return;
    try {
      await fetch('/api/user/key', { method: 'DELETE' });
      setKeyStatus('none');
      setMaskedKey('');
      setMessage('API Key 已删除');
    } catch {
      setMessage('删除失败');
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
      setMessage(json.ok ? '已经保存好啦 ✅' : '保存失败');
    } catch {
      setMessage('保存失败');
    }
  };

  if (status === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.empty}>
            <div style={styles.emptyIcon}><IconSettings /></div>
            <p style={styles.emptyText}>登录后才能保存你的设置哦</p>
            <button onClick={() => signIn('google')} style={styles.primaryBtn}>Google 登录</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>设置</h1>
        <button onClick={() => signOut()} style={styles.logoutBtn}><IconLogout /> 退出</button>
      </div>

      <div style={styles.userInfo}>
        <div style={styles.avatar}>
          {session?.user?.image
            ? <img src={session.user.image} alt="" style={styles.avatarImg} />
            : <IconSettings />}
        </div>
        <div>
          <div style={styles.userName}>{session?.user?.name || '用户'}</div>
          <div style={styles.userEmail}>{session?.user?.email}</div>
        </div>
      </div>

      {message && <div style={styles.msg}>{message}</div>}

      <div style={styles.card}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>API 密钥（给爸爸妈妈填）</h2>
          <p style={styles.sectionDesc}>这里需要请爸爸妈妈帮忙填写，会加密存储，放心使用。</p>

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
            获取 Claude API Key
          </a>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>我的偏好</h2>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>常学的学科</label>
            <select value={defaultSubject} onChange={e => setDefaultSubject(e.target.value)} style={styles.select}>
              <option value="数学">数学</option>
              <option value="语文">语文</option>
              <option value="英语">英语</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>AI 模型</label>
            <select value={defaultModel} onChange={e => setDefaultModel(e.target.value)} style={styles.select}>
              <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
              <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku</option>
              <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            </select>
          </div>

          <button onClick={handleSaveSettings} style={styles.primaryBtn}>保存</button>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px', background: '#f8f9fc', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', fontSize: '12px', color: '#8e95a2', background: '#f0f2f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '40px', color: '#8e95a2' },
  empty: { textAlign: 'center', padding: '48px 20px' },
  emptyIcon: { width: '48px', height: '48px', margin: '0 auto 12px', color: '#c0c4cc' },
  emptyText: { color: '#8e95a2', marginBottom: '16px', fontSize: '14px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #eef0f4', marginBottom: '16px' },
  avatar: { width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef1ff', color: '#4f6ef7' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  userName: { fontSize: '15px', fontWeight: 600, color: '#1a1a2e' },
  userEmail: { fontSize: '12px', color: '#8e95a2' },
  msg: { padding: '10px 14px', borderRadius: '8px', background: '#eafaf1', color: '#27ae60', fontSize: '12px', marginBottom: '12px' },
  card: { background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #eef0f4' },
  section: { marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #eef0f4' },
  sectionTitle: { fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px 0' },
  sectionDesc: { fontSize: '12px', color: '#8e95a2', margin: '0 0 12px 0', lineHeight: '1.5' },
  keyInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#eef1ff', borderRadius: '8px', fontSize: '12px', color: '#4f6ef7', fontWeight: 500, marginBottom: '10px' },
  dangerBtn: { padding: '4px 10px', fontSize: '11px', color: '#d63031', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: '6px', cursor: 'pointer' },
  keyInputRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  keyInput: { flex: 1, padding: '10px 12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '8px', outline: 'none', fontFamily: 'monospace' },
  primaryBtn: { padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  extLink: { display: 'inline-block', fontSize: '12px', color: '#4f6ef7', textDecoration: 'none' },
  settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  settingLabel: { fontSize: '13px', fontWeight: 500, color: '#555' },
  select: { padding: '8px 12px', fontSize: '12px', border: '1px solid #e0e4ee', borderRadius: '8px', outline: 'none', color: '#333', background: 'white' },
};
