'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { IconSettings, IconLogout, IconMail, IconCheck } from '../../lib/icons';
import { ModelSelector } from '../components/ModelSelector';

export default function Settings() {
  const { data: session, status } = useSession();
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<'none' | 'has' | 'saving'>('none');
  const [maskedKey, setMaskedKey] = useState('');
  const [message, setMessage] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('数学');
  const [defaultModel, setDefaultModel] = useState('claude-3-5-sonnet-latest');
  const [mode, setMode] = useState('student');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [modelRefreshKey, setModelRefreshKey] = useState(0);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [resending, setResending] = useState(false);

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
      setApiBaseUrl(json.baseUrl || '');
    } catch {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      const json = await res.json();
      if (json.defaultSubject) setDefaultSubject(json.defaultSubject);
      if (json.defaultModel) setDefaultModel(json.defaultModel);
      if (json.mode) setMode(json.mode);
      if (json.apiBaseUrl) setApiBaseUrl(json.apiBaseUrl);
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const result = await signIn('credentials', {
      email: loginEmail.trim(),
      password: loginPassword,
      redirect: false,
    });
    if (result?.error) {
      setLoginError('邮箱或密码错误');
    } else {
      window.location.reload();
    }
    setLoggingIn(false);
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });
      const json = await res.json();
      setMessage(json.ok ? '验证邮件已发送' : json.error || '发送失败');
    } catch {
      setMessage('发送失败');
    }
    setResending(false);
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setKeyStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/user/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), baseUrl: apiBaseUrl.trim() || undefined }),
      });
      let errorMsg: string | null = null;
      try {
        const json = await res.json();
        errorMsg = json.error || null;
        if (!errorMsg) {
          setKeyStatus('has');
          setMaskedKey(json.maskedKey);
          setApiKey('');
          setMessage('API Key 已加密保存');
          setModelRefreshKey(k => k + 1);
        }
      } catch {
        setMessage('保存失败');
      }
      if (errorMsg) setMessage(errorMsg);
    } catch {
      setMessage('保存失败');
    }
    if (keyStatus === 'saving') setKeyStatus('none');
  };

  const handleRemoveKey = async () => {
    setKeyStatus('saving');
    try {
      await fetch('/api/user/key', { method: 'DELETE' });
      setKeyStatus('none');
      setMaskedKey('');
      setApiKey('');
      setMessage('API Key 已删除');
      setModelRefreshKey(k => k + 1);
    } catch {
      setMessage('删除失败');
    }
    setKeyStatus('none');
  };

  const handleSaveSettings = async () => {
    setMessage('');
    try {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultSubject,
          defaultModel,
          mode,
          apiBaseUrl: apiBaseUrl || undefined,
        }),
      });
      setMessage('设置已保存');
    } catch {
      setMessage('保存失败');
    }
  };

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>加载中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>登录</h1>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="邮箱"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="密码"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              style={styles.input}
              required
            />
            {loginError && <div style={styles.error}>{loginError}</div>}
            <button type="submit" disabled={loggingIn} style={{ ...styles.btn, ...(loggingIn ? styles.btnDisabled : {}) }}>
              {loggingIn ? '登录中...' : '登录'}
            </button>
          </form>
          <p style={styles.footer}>
            还没有账号？<a href="/register" style={styles.link}>立即注册</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>个人设置</h1>

        <div style={styles.accountBox}>
          <div style={styles.accountRow}>
            <IconMail />
            <span style={styles.accountEmail}>{session?.user?.email}</span>
          </div>
          {(session?.user as any)?.needsEmailVerify && (
            <div style={styles.verifyBox}>
              <span style={styles.verifyText}>⚠️ 需要验证邮箱</span>
              <button onClick={handleResendVerification} disabled={resending} style={styles.resendBtn}>
                {resending ? '发送中...' : '发送验证邮件'}
              </button>
            </div>
          )}
        </div>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>API 密钥（给爸爸妈妈填）</h2>
          <p style={styles.sectionDesc}>这里需要请爸爸妈妈帮忙填写，会加密存储，放心使用。</p>

          <div style={styles.keyGuideBox}>
            <div style={styles.keyGuideTitle}>📋 怎么获取 API Key？</div>
            <div style={styles.keyGuideSteps}>
              <div style={styles.keyGuideStep}>
                <span style={styles.keyGuideNum}>1</span>
                <span>让爸爸妈妈打开 <a href="https://console.anthropic.com" target="_blank" style={styles.keyGuideLink}>console.anthropic.com</a></span>
              </div>
              <div style={styles.keyGuideStep}>
                <span style={styles.keyGuideNum}>2</span>
                <span>登录后在 <strong>API Keys</strong> 页面点击 <strong>Create Key</strong></span>
              </div>
              <div style={styles.keyGuideStep}>
                <span style={styles.keyGuideNum}>3</span>
                <span>复制以 <code style={styles.keyGuideCode}>sk-ant-</code> 开头的密钥，粘贴到下面</span>
              </div>
            </div>
            <div style={styles.keyGuideTip}>💡 也可以用 <a href="https://siliconflow.cn" target="_blank" style={styles.keyGuideLink}>SiliconFlow</a> 的兼容接口（免费额度更多）</div>
          </div>

          {keyStatus === 'has' && maskedKey ? (
            <div style={styles.keyRow}>
              <input type="text" value={maskedKey} readOnly style={styles.input} />
              <button onClick={handleRemoveKey} style={styles.removeBtn}>删除</button>
            </div>
          ) : (
            <div style={styles.keyRow}>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={styles.input}
              />
              <button onClick={handleSaveKey} disabled={keyStatus === 'saving'} style={{ ...styles.btn, ...(keyStatus === 'saving' ? styles.btnDisabled : {}) }}>
                保存
              </button>
            </div>
          )}
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>学习偏好</h2>
          <label style={styles.label}>默认学科</label>
          <select value={defaultSubject} onChange={e => setDefaultSubject(e.target.value)} style={styles.input}>
            <option value="数学">数学</option>
            <option value="语文">语文</option>
            <option value="英语">英语</option>
            <option value="其他">其他</option>
          </select>

          <label style={styles.label}>默认模型</label>
          <ModelSelector key={modelRefreshKey} />

          <label style={styles.label}>隐私模式</label>
          <div style={styles.modeToggleRow}>
            <button
              onClick={() => setMode('student')}
              style={{ ...styles.modeToggle, ...(mode === 'student' ? styles.modeToggleActive : {}) }}
            >
              学生
            </button>
            <button
              onClick={() => setMode('parent')}
              style={{ ...styles.modeToggle, ...(mode === 'parent' ? styles.modeToggleParentActive : {}) }}
            >
              家长
            </button>
          </div>

          <button onClick={handleSaveSettings} style={{ ...styles.btn, marginTop: '16px' }}>保存设置</button>
        </section>

        {message && <div style={styles.message}>{message}</div>}

        <button onClick={() => signOut({ callbackUrl: '/settings' })} style={styles.logoutBtn}>
          <IconLogout /> 退出登录
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px', background: '#f8f9fc', minHeight: '100vh' },
  loadingBox: { textAlign: 'center', padding: '40px', color: '#8e95a2' },
  card: { background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #eef0f4', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 20px 0' },
  input: { width: '100%', padding: '12px 14px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '10px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' },
  btn: { padding: '12px 20px', fontSize: '14px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: { padding: '10px', background: '#fff5f5', color: '#d63031', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
  footer: { fontSize: '13px', color: '#8e95a2', textAlign: 'center', marginTop: '20px', marginBottom: 0 },
  link: { color: '#4f6ef7', textDecoration: 'none', fontWeight: 600 },
  accountBox: { padding: '14px', background: '#f8f9fc', borderRadius: '10px', marginBottom: '20px' },
  accountRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  accountEmail: { fontSize: '14px', fontWeight: 500, color: '#1a1a2e' },
  verifyBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '8px', background: '#fff3cd', borderRadius: '6px' },
  verifyText: { fontSize: '13px', color: '#856404' },
  resendBtn: { padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#856404', background: 'transparent', border: '1px solid #856404', borderRadius: '6px', cursor: 'pointer' },
  section: { marginBottom: '24px', border: '1px solid #eef0f4', borderRadius: '12px', padding: '16px' },
  sectionTitle: { fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' },
  sectionDesc: { fontSize: '13px', color: '#8e95a2', margin: '0 0 12px 0' },
  keyGuideBox: { padding: '12px 14px', background: '#f8f9fc', borderRadius: '8px', marginBottom: '12px', border: '1px solid #eef0f4' },
  keyGuideTitle: { fontSize: '13px', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' },
  keyGuideSteps: { display: 'flex', flexDirection: 'column', gap: '6px' },
  keyGuideStep: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#555', lineHeight: '1.5' },
  keyGuideNum: { width: '18px', height: '18px', borderRadius: '50%', background: '#4f6ef7', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' },
  keyGuideLink: { color: '#4f6ef7', textDecoration: 'none' },
  keyGuideCode: { background: '#eef1ff', color: '#4f6ef7', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' },
  keyGuideTip: { marginTop: '8px', fontSize: '11px', color: '#8e95a2', lineHeight: '1.5' },
  keyRow: { display: 'flex', gap: '8px' },
  removeBtn: { padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#d63031', background: 'white', border: '1px solid #d63031', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '4px' },
  modeToggleRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  modeToggle: { flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, color: '#4f6ef7', background: 'white', border: '1px solid #d0d8ff', borderRadius: '8px', cursor: 'pointer' },
  modeToggleActive: { color: '#4f6ef7', background: '#eef1ff' },
  modeToggleParentActive: { color: '#e67e22', background: '#fef9e7', borderColor: '#fce4b3' },
  message: { padding: '10px', background: '#eafaf1', color: '#27ae60', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' },
  logoutBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600, color: '#d63031', background: 'white', border: '1px solid #d63031', borderRadius: '10px', cursor: 'pointer', marginTop: '8px' },
};
