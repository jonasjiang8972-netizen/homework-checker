'use client';

import { useEffect, useState } from 'react';

/** 家长周报设置：填写家长邮箱、开关每周自动发送、立即发送一份 */
export function ReportSettings() {
  const [parentEmail, setParentEmail] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/user/settings')
      .then((r) => r.json())
      .then((j) => {
        if (typeof j.parentEmail === 'string') setParentEmail(j.parentEmail);
        setEnabled(!!j.weeklyReport);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/user/report-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentEmail, weeklyReport: enabled }),
      });
      const j = await res.json();
      setMsg(j.error || '已保存');
    } catch {
      setMsg('保存失败，请重试');
    }
    setBusy(false);
  };

  const sendNow = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/reports/weekly', { method: 'POST' });
      const j = await res.json();
      setMsg(j.error || '周报已发送到家长邮箱');
    } catch {
      setMsg('发送失败，请重试');
    }
    setBusy(false);
  };

  return (
    <section style={styles.section}>
      <div style={styles.title}>家长周报</div>
      <p style={styles.desc}>每周把学习汇总（做题数、正确率、薄弱点）发给家长，不含题目和图片。</p>
      <input
        type="email"
        value={parentEmail}
        onChange={(e) => setParentEmail(e.target.value)}
        placeholder="家长邮箱"
        style={styles.input}
      />
      <label style={styles.check}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        每周自动发送
      </label>
      <div style={styles.row}>
        <button onClick={save} disabled={busy} style={styles.btn}>保存</button>
        <button onClick={sendNow} disabled={busy || !parentEmail} style={styles.btnGhost}>立即发送一份</button>
      </div>
      {msg && <div style={styles.msg}>{msg}</div>}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { background: 'white', border: '1px solid #eef0f4', borderRadius: '12px', padding: '16px', marginTop: '16px' },
  title: { fontSize: '15px', fontWeight: 600, color: '#1a1a2e' },
  desc: { fontSize: '12px', color: '#8e95a2', margin: '4px 0 10px' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #dfe3ea', borderRadius: '8px', fontSize: '14px' },
  check: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#333', margin: '10px 0' },
  row: { display: 'flex', gap: '8px' },
  btn: { padding: '8px 18px', background: '#4f6ef7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  btnGhost: { padding: '8px 18px', background: '#f0f2f5', color: '#444', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  msg: { fontSize: '12px', color: '#4f6ef7', marginTop: '8px' },
};
