'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [loginCode, setLoginCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

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

  const handleSendCode = async () => {
    if (!loginEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setLoginError('请输入正确的邮箱地址');
      return;
    }
    if (countdown > 0) return;
    setSendingCode(true);
    setLoginError('');
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 20000);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim() }),
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (json.error) {
        setLoginError(json.error);
      } else {
        setCodeSent(true);
        setLoginError('');
        setCountdown(60);
        countdownRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              countdownRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setLoginError('请求超时，请稍后重试');
      } else {
        setLoginError('网络错误，请稍后重试');
      }
    }
    setSendingCode(false);
  };

  const handleLogin = async () => {
    if (!loginCode.trim()) return;
    setLoggingIn(true);
    setLoginError('');
    const result = await signIn('email-code', {
      email: loginEmail.trim(),
      code: loginCode.trim(),
      redirect: false,
    });
    if (result?.error) {
      setLoginError('验证码错误或已过期，请重新获取');
      setLoggingIn(false);
    } else if (result?.ok) {
      window.location.href = '/';
    } else {
      setLoggingIn(false);
    }
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
          setKeyStatus('none');
          return;
        }
      } catch {
        errorMsg = `HTTP ${res.status} ${res.statusText}`;
      }
      setMessage(errorMsg);
    } catch (e) {
      setMessage(`网络错误: ${e instanceof Error ? e.message : '请求失败'}`);
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
      setModelRefreshKey(k => k + 1);
    } catch {
      setMessage('删除失败');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultSubject, defaultModel, mode, apiBaseUrl: apiBaseUrl || null }),
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
        <div style={styles.header}>
          <h1 style={styles.title}>登录</h1>
        </div>

        <div style={styles.card}>
          <div style={styles.loginForm}>
            <input
              type="email"
              placeholder="输入邮箱地址"
              value={loginEmail}
              onChange={e => { setLoginEmail(e.target.value); setCodeSent(false); setLoginError(''); }}
              style={styles.loginInput}
              disabled={codeSent}
            />
            {!codeSent ? (
              <button
                onClick={handleSendCode}
                disabled={sendingCode || !loginEmail.trim() || countdown > 0}
                style={{ ...styles.primaryBtn, width: '100%', ...((sendingCode || !loginEmail.trim() || countdown > 0) ? styles.btnDisabled : {}) }}
              >
                {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s 后可重发` : '发送验证码'}
              </button>
            ) : (
              <>
                <div style={styles.codeSentInfo}><IconCheck /> 验证码已发送到 {loginEmail}</div>
                <input
                  type="text"
                  placeholder="输入6位验证码"
                  value={loginCode}
                  onChange={e => setLoginCode(e.target.value)}
                  style={styles.loginInput}
                  maxLength={6}
                />
                <button
                  onClick={handleLogin}
                  disabled={loggingIn || loginCode.length !== 6}
                  style={{ ...styles.primaryBtn, width: '100%', ...((loggingIn || loginCode.length !== 6) ? styles.btnDisabled : {}) }}
                >
                  {loggingIn ? '登录中...' : '登录'}
                </button>
                <button
                  onClick={() => { setCodeSent(false); setLoginCode(''); }}
                  style={styles.linkBtn}
                >更换邮箱</button>
              </>
            )}

            {loginError && <div style={styles.loginError}>{loginError}</div>}
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
          <input
            type="text"
            value={apiBaseUrl}
            onChange={e => setApiBaseUrl(e.target.value)}
            placeholder="API 接口地址（如 https://api.siliconflow.cn/v1）"
            style={{ ...styles.keyInput, marginBottom: '8px', fontSize: '12px', fontFamily: 'monospace' }}
          />
          <a href="https://console.anthropic.com" target="_blank" style={styles.extLink}>
            获取 Claude API Key
          </a>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>API 接口地址</h2>
          <p style={styles.sectionDesc}>如果使用 SiliconFlow，保持默认即可。如需使用其他兼容接口，请填写完整地址（如 https://api.openai.com/v1）。</p>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={e => setApiBaseUrl(e.target.value)}
            placeholder="https://api.siliconflow.cn/v1"
            style={styles.keyInput}
          />
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
          </div>
          <ModelSelector refreshKey={modelRefreshKey} />

          <div style={{ ...styles.settingRow, marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eef0f4' }}>
            <div>
              <label style={styles.settingLabel}>使用模式</label>
              <div style={{ fontSize: '11px', color: '#8e95a2', marginTop: '2px' }}>
                {mode === 'student' ? '只看趋势汇总，不暴露单题细节' : '可查看全部批改细节'}
              </div>
            </div>
            <button
              onClick={() => setMode(m => m === 'student' ? 'parent' : 'student')}
              style={{
                ...styles.modeToggle,
                ...(mode === 'parent' ? styles.modeToggleParent : {}),
              }}
            >
              {mode === 'student' ? '👤 学生模式' : '👨‍👩‍👧 家长模式'}
            </button>
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
  loginForm: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' },
  loginInput: { width: '100%', padding: '12px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' },
  loginError: { padding: '10px 14px', borderRadius: '8px', background: '#fff5f5', color: '#d63031', fontSize: '12px' },
  codeSentInfo: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#27ae60', fontWeight: 500 },
  linkBtn: { background: 'none', border: 'none', color: '#4f6ef7', fontSize: '13px', cursor: 'pointer', padding: 0, textAlign: 'center' },
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
  modeToggle: { padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#4f6ef7', background: '#eef1ff', border: '1px solid #d0d8ff', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' },
  modeToggleParent: { color: '#e67e22', background: '#fef9e7', borderColor: '#fce4b3' },
  keyGuideBox: { padding: '12px 14px', background: '#f8f9fc', borderRadius: '8px', marginBottom: '12px', border: '1px solid #eef0f4' },
  keyGuideTitle: { fontSize: '13px', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' },
  keyGuideSteps: { display: 'flex', flexDirection: 'column', gap: '6px' },
  keyGuideStep: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#555', lineHeight: '1.5' },
  keyGuideNum: { width: '18px', height: '18px', borderRadius: '50%', background: '#4f6ef7', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' },
  keyGuideLink: { color: '#4f6ef7', textDecoration: 'none' },
  keyGuideCode: { background: '#eef1ff', color: '#4f6ef7', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' },
  keyGuideTip: { marginTop: '8px', fontSize: '11px', color: '#8e95a2', lineHeight: '1.5' },
};
