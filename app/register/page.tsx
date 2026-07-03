'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码');
      return;
    }
    if (password.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('注册失败，请稍后重试');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={styles.title}>注册成功！</h2>
          <p style={styles.desc}>验证邮件已发送到你的邮箱，请查收并验证。</p>
          <button onClick={() => router.push('/settings')} style={styles.btn}>
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>注册作业小帮手</h1>
        <p style={styles.desc}>创建账号，开始你的学习之旅</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="昵称（可选）"
            value={name}
            onChange={e => setName(e.target.value)}
            style={styles.input}
          />
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="密码（至少 8 位）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="确认密码"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p style={styles.footer}>
          已有账号？<a href="/settings" style={styles.link}>立即登录</a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '480px', margin: '0 auto', padding: '40px 16px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #eef0f4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
  title: { fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px 0', textAlign: 'center' },
  desc: { fontSize: '14px', color: '#8e95a2', margin: '0 0 24px 0', textAlign: 'center' },
  input: { width: '100%', padding: '12px 14px', fontSize: '14px', border: '1px solid #e0e4ee', borderRadius: '10px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '10px', cursor: 'pointer' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: { padding: '10px', background: '#fff5f5', color: '#d63031', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', textAlign: 'center' },
  footer: { fontSize: '13px', color: '#8e95a2', textAlign: 'center', marginTop: '20px' },
  link: { color: '#4f6ef7', textDecoration: 'none', fontWeight: 600 },
};
